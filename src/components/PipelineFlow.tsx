import React from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  Background,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ── Shared styles ─────────────────────────────────────────────
const font: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: '12px',
  lineHeight: 1.5,
};

const nodeBase: React.CSSProperties = {
  ...font,
  background: 'rgba(0,255,65,0.03)',
  border: '1px solid rgba(0,255,65,0.22)',
  borderRadius: '6px',
  color: '#e8e8e8',
  padding: '8px 14px',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const handle: React.CSSProperties = {
  background: 'rgba(0,255,65,0.25)',
  border: '1px solid rgba(0,255,65,0.4)',
  width: 7,
  height: 7,
};

const codeChip: React.CSSProperties = {
  color: '#00ff41',
  background: 'rgba(0,255,65,0.1)',
  padding: '0 5px',
  borderRadius: '3px',
  fontSize: '11px',
};

// ── Node data types ───────────────────────────────────────────
interface StdData extends Record<string, unknown> {
  label?: string;
  beforeCode?: string;
  codePart?: string;
  afterCode?: string;
}

interface EnvData extends Record<string, unknown> {
  label: string;
  dotColor: string;
}

// ── Label helper ──────────────────────────────────────────────
function NodeLabel({ data }: { data: StdData }) {
  if (data.codePart) {
    return (
      <>
        {data.beforeCode}
        <code style={codeChip}>{data.codePart}</code>
        {data.afterCode}
      </>
    );
  }
  return <>{data.label ?? ''}</>;
}

// ── Custom node components ────────────────────────────────────
function StartNode(_props: NodeProps) {
  return (
    <div
      style={{
        ...font,
        background: 'rgba(0,255,65,0.07)',
        border: '1px solid #00cc33',
        borderRadius: '6px',
        color: '#00ff41',
        fontWeight: 700,
        letterSpacing: '0.12em',
        padding: '8px 22px',
        boxShadow: '0 0 18px rgba(0,255,65,0.18)',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      ▶ START
      <Handle type="source" position={Position.Bottom} style={handle} />
    </div>
  );
}

function DecisionNode({ data }: NodeProps) {
  const d = data as StdData;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Rotated box that forms the diamond shape */}
      <div
        style={{
          position: 'absolute',
          inset: 6,
          border: '1px solid rgba(249,168,37,0.55)',
          transform: 'rotate(45deg)',
          borderRadius: '4px',
          background: 'rgba(249,168,37,0.05)',
          boxShadow: '0 0 14px rgba(249,168,37,0.14)',
        }}
      />
      <span
        style={{
          ...font,
          position: 'relative',
          zIndex: 1,
          color: '#f9a825',
          fontWeight: 700,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        {d.label}
      </span>
      <Handle type="target" position={Position.Top} style={{ ...handle, top: -3 }} />
      <Handle id="left" type="source" position={Position.Left} style={{ ...handle, left: -3 }} />
      <Handle id="right" type="source" position={Position.Right} style={{ ...handle, right: -3 }} />
    </div>
  );
}

function StandardNode({ data }: NodeProps) {
  const d = data as StdData;
  return (
    <div style={nodeBase}>
      <Handle type="target" position={Position.Top} style={handle} />
      <NodeLabel data={d} />
      <Handle type="source" position={Position.Bottom} style={handle} />
    </div>
  );
}

function EnvNode({ data }: NodeProps) {
  const d = data as EnvData;
  return (
    <div
      style={{
        ...nodeBase,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Handle type="target" position={Position.Top} style={handle} />
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: d.dotColor,
          boxShadow: `0 0 7px ${d.dotColor}`,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      <span>{d.label}</span>
      <Handle type="source" position={Position.Bottom} style={handle} />
    </div>
  );
}

function ProductionNode(_props: NodeProps) {
  return (
    <div
      style={{
        ...font,
        background: 'rgba(0,255,65,0.08)',
        border: '1px solid #00ff41',
        borderRadius: '6px',
        color: '#e8e8e8',
        fontWeight: 600,
        fontSize: '13px',
        padding: '10px 22px',
        boxShadow: '0 0 22px rgba(0,255,65,0.22), inset 0 0 18px rgba(0,255,65,0.05)',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Handle type="target" position={Position.Top} style={handle} />
      <span style={{ color: '#00ff41', textShadow: '0 0 10px rgba(0,255,65,0.8)' }}>✓</span>{' '}
      Production Live{' · '}
      <a
        href="https://denistechs.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#00ff41', textDecoration: 'underline', textUnderlineOffset: '3px' }}
      >
        denistechs.com
      </a>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  decisionNode: DecisionNode,
  standardNode: StandardNode,
  envNode: EnvNode,
  productionNode: ProductionNode,
};

// ── Edge style ────────────────────────────────────────────────
const edgeStyle: React.CSSProperties = {
  stroke: 'rgba(0,255,65,0.38)',
  strokeWidth: 1.5,
};

const arrow = {
  type: MarkerType.ArrowClosed,
  color: 'rgba(0,255,65,0.55)',
  width: 13,
  height: 13,
};

const labelStyle: React.CSSProperties = {
  fill: '#8a8a8a',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px',
};

const labelBgStyle: React.CSSProperties = {
  fill: 'rgba(8,8,8,0.88)',
  rx: 3,
  ry: 3,
} as React.CSSProperties;

// ── Graph definition ──────────────────────────────────────────
//
// Each column has a fixed, uniform width so every node's centre handle
// lands at the same absolute x — enabling perfectly straight vertical
// edges within the same column.
//
//  start / decision / post-merge centre: x+w/2 = 250
//  Left branch  (w=260, x=  0): handle centre at x=130
//  Right branch (w=240, x=490): handle centre at x=610
//  Centre start (w=140, x=180): handle centre at x=250
//  Centre decision (w=160, h=80, x=170): handle centre at x=250
//  Post-merge   (w=290, x=105): handle centre at x=250
//  Production   (w=390, x= 55): handle centre at x=250
//
const initialNodes: Node[] = [
  // ── Centre column ──────────────────────────────────────────
  {
    id: 'start',
    type: 'startNode',
    position: { x: 180, y: 0 },
    style: { width: '140px' },
    data: {},
  },
  {
    id: 'decision',
    type: 'decisionNode',
    position: { x: 170, y: 72 },
    style: { width: '160px', height: '80px' },
    data: { label: 'Work Type?' },
  },

  // ── Left branch (Claude Code) — all x=0, w=260, centre at 130
  {
    id: 'push_feature',
    type: 'standardNode',
    position: { x: 0, y: 210 },
    style: { width: '260px' },
    data: { beforeCode: 'Push to ', codePart: 'feature/*', afterCode: ' branch' },
  },
  {
    id: 'cf_preview',
    type: 'envNode',
    position: { x: 0, y: 296 },
    style: { width: '260px' },
    data: { label: 'Cloudflare Preview Instance', dotColor: '#f38020' },
  },
  {
    id: 'test_review',
    type: 'standardNode',
    position: { x: 0, y: 382 },
    style: { width: '260px' },
    data: { label: 'Test & Review Preview' },
  },
  {
    id: 'merge_dev',
    type: 'standardNode',
    position: { x: 0, y: 468 },
    style: { width: '260px' },
    data: { beforeCode: 'Merge into ', codePart: 'dev' },
  },

  // ── Right branch (Manual Dev) — x=490, w=240, centre at 610
  {
    id: 'push_dev',
    type: 'standardNode',
    position: { x: 490, y: 296 },
    style: { width: '240px' },
    data: { beforeCode: 'Push directly to ', codePart: 'dev' },
  },

  // ── Centre column (converge) — x=105, w=290, centre at 250
  {
    id: 'cf_staging',
    type: 'envNode',
    position: { x: 105, y: 590 },
    style: { width: '290px' },
    data: { label: 'Cloudflare Staging Instance', dotColor: '#f38020' },
  },
  {
    id: 'validate',
    type: 'standardNode',
    position: { x: 105, y: 676 },
    style: { width: '290px' },
    data: { label: 'Validate Staging' },
  },
  {
    id: 'merge_main',
    type: 'standardNode',
    position: { x: 105, y: 762 },
    style: { width: '290px' },
    data: { beforeCode: 'Merge into ', codePart: 'main' },
  },
  {
    id: 'gh_actions',
    type: 'envNode',
    position: { x: 105, y: 848 },
    style: { width: '290px' },
    data: { label: 'GitHub Actions → Deploy', dotColor: '#00ff41' },
  },
  {
    id: 'production',
    type: 'productionNode',
    position: { x: 55, y: 934 },
    style: { width: '390px' },
    data: {},
  },
];

const initialEdges: Edge[] = [
  // Start → Decision  (same centre column → straight)
  {
    id: 'e-start-decision',
    source: 'start',
    target: 'decision',
    type: 'straight',
    style: edgeStyle,
    markerEnd: arrow,
  },
  // Decision → left branch (Claude Code)
  {
    id: 'e-decision-feature',
    source: 'decision',
    sourceHandle: 'left',
    target: 'push_feature',
    type: 'smoothstep',
    label: 'Claude Code',
    labelStyle,
    labelBgStyle,
    labelBgPadding: [4, 6] as [number, number],
    style: edgeStyle,
    markerEnd: arrow,
  },
  // Decision → right branch (Manual Dev)
  {
    id: 'e-decision-dev',
    source: 'decision',
    sourceHandle: 'right',
    target: 'push_dev',
    type: 'smoothstep',
    label: 'Manual Dev',
    labelStyle,
    labelBgStyle,
    labelBgPadding: [4, 6] as [number, number],
    style: edgeStyle,
    markerEnd: arrow,
  },
  // Left branch chain  (same left column → straight)
  {
    id: 'e-feature-preview',
    source: 'push_feature',
    target: 'cf_preview',
    type: 'straight',
    style: edgeStyle,
    markerEnd: arrow,
  },
  {
    id: 'e-preview-test',
    source: 'cf_preview',
    target: 'test_review',
    type: 'straight',
    style: edgeStyle,
    markerEnd: arrow,
  },
  {
    id: 'e-test-merge',
    source: 'test_review',
    target: 'merge_dev',
    type: 'straight',
    style: edgeStyle,
    markerEnd: arrow,
  },
  // Both branches converge → Staging
  {
    id: 'e-merge-staging',
    source: 'merge_dev',
    target: 'cf_staging',
    type: 'smoothstep',
    style: edgeStyle,
    markerEnd: arrow,
  },
  {
    id: 'e-dev-staging',
    source: 'push_dev',
    target: 'cf_staging',
    type: 'smoothstep',
    style: edgeStyle,
    markerEnd: arrow,
  },
  // Centre chain to production  (same centre column → straight)
  {
    id: 'e-staging-validate',
    source: 'cf_staging',
    target: 'validate',
    type: 'straight',
    style: edgeStyle,
    markerEnd: arrow,
  },
  {
    id: 'e-validate-main',
    source: 'validate',
    target: 'merge_main',
    type: 'straight',
    style: edgeStyle,
    markerEnd: arrow,
  },
  {
    id: 'e-main-gh',
    source: 'merge_main',
    target: 'gh_actions',
    type: 'straight',
    style: edgeStyle,
    markerEnd: arrow,
  },
  {
    id: 'e-gh-production',
    source: 'gh_actions',
    target: 'production',
    type: 'straight',
    style: edgeStyle,
    markerEnd: arrow,
  },
];

// ── Component ─────────────────────────────────────────────────
export default function PipelineFlow() {
  return (
    <div
      style={{
        width: '100%',
        height: '960px',
        borderRadius: '8px',
        border: '1px solid rgba(0,255,65,0.1)',
        overflow: 'hidden',
      }}
    >
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.06 }}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background
          color="rgba(0,255,65,0.06)"
          gap={22}
          size={1}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
    </div>
  );
}
