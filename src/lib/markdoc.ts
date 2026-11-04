import Markdoc, { type Config, type RenderableTreeNode } from '@markdoc/markdoc'
import React from 'react'
import { Callout } from '@/components/markdoc/Callout'
import { CodeBlock } from '@/components/markdoc/CodeBlock'
import { Box, Flow, Grid } from '@/components/markdoc/Diagram'
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
    flow: {
      render: 'Flow',
      attributes: {
        title: { type: String },
        caption: { type: String },
        direction: { type: String, default: 'col', matches: ['col', 'row'] },
      },
    },
    grid: {
      render: 'Grid',
      attributes: {
        title: { type: String },
        desc: { type: String },
        caption: { type: String },
        cols: { type: Number, default: 2 },
      },
    },
    box: {
      render: 'Box',
      selfClosing: true,
      attributes: {
        title: { type: String, required: true },
        desc: { type: String },
        label: { type: String },
        badge: { type: String },
        tone: {
          type: String,
          default: 'default',
          matches: ['default', 'blue', 'green', 'amber', 'muted'],
        },
        arrow: { type: String },
        both: { type: Boolean },
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
  Box,
  Callout,
  CodeBlock,
  Flow,
  Grid,
  Figure,
  ImageRow,
  MarkdocImage,
  MarkdocLink,
  Note,
  Steps,
  Step,
}

export function parseMarkdoc(source: string): RenderableTreeNode {
  const ast = Markdoc.parse(source, { allowComments: true } as Parameters<
    typeof Markdoc.parse
  >[1])
  const errors = Markdoc.validate(ast, config)

  if (errors.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[markdoc] validation errors:', errors)
  }

  return Markdoc.transform(ast, config)
}

export function renderMarkdoc(node: RenderableTreeNode): React.ReactNode {
  return Markdoc.renderers.react(node, React, { components })
}
