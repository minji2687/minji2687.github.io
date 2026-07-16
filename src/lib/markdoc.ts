import Markdoc, { type Config, type RenderableTreeNode } from '@markdoc/markdoc'
import React from 'react'
import { Callout } from '@/components/markdoc/Callout'
import { CodeBlock } from '@/components/markdoc/CodeBlock'
import { Figure } from '@/components/markdoc/Figure'
import { ImageRow } from '@/components/markdoc/ImageRow'
import { MarkdocImage } from '@/components/markdoc/MarkdocImage'
import { MarkdocLink } from '@/components/markdoc/MarkdocLink'
import { Note } from '@/components/markdoc/Note'
import { Steps, Step } from '@/components/markdoc/Steps'

const config: Config = {
  tags: {
    callout: {
      render: 'Callout',
      attributes: {
        type: {
          type: String,
          default: 'info',
          matches: ['info', 'warning', 'success', 'error'],
        },
        title: { type: String },
      },
    },
    note: {
      render: 'Note',
      attributes: {
        title: { type: String },
      },
    },
    'image-row': {
      render: 'ImageRow',
    },
    figure: {
      render: 'Figure',
      attributes: {
        caption: { type: String },
      },
    },
    steps: {
      render: 'Steps',
    },
    step: {
      render: 'Step',
      attributes: {
        title: { type: String },
      },
    },
  },
  nodes: {
    fence: {
      render: 'CodeBlock',
      attributes: {
        language: { type: String },
        content: { type: String },
      },
    },
    image: {
      render: 'MarkdocImage',
      attributes: {
        src: { type: String },
        alt: { type: String },
        title: { type: String },
      },
    },
    link: {
      render: 'MarkdocLink',
      attributes: {
        href: { type: String, required: true },
        title: { type: String },
      },
    },
  },
}

const components = {
  Callout,
  CodeBlock,
  Figure,
  ImageRow,
  MarkdocImage,
  MarkdocLink,
  Note,
  Steps,
  Step,
}

export function parseMarkdoc(source: string): RenderableTreeNode {
  const ast = Markdoc.parse(source)
  const errors = Markdoc.validate(ast, config)

  if (errors.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[markdoc] validation errors:', errors)
  }

  return Markdoc.transform(ast, config)
}

export function renderMarkdoc(node: RenderableTreeNode): React.ReactNode {
  return Markdoc.renderers.react(node, React, { components })
}
