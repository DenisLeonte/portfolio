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
  // Node container is 160×92px (set via style prop in initialNodes).
  // SVG viewBox matches so the polygon always fills it correctly.
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
      {/* SVG polygon — precise diamond regardless of aspect ratio */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        viewBox="0 0 160 92"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="diamond-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(249,168,37,0.35)" />
          </filter>
        </defs>
        {/* top(80,3) right(157,46) bottom(80,89) left(3,46) */}
        <polygon
          points="80,3 157,46 80,89 3,46"
          fill="rgba(249,168,37,0.06)"
          stroke="rgba(249,168,37,0.6)"
          strokeWidth="1"
          filter="url(#diamond-glow)"
        />
      </svg>
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
      <Handle type="target" position={Position.Top} style={handle} />
      <Handle id="left" type="source" position={Position.Left} style={handle} />
      <Handle id="right" type="source" position={Position.Right} style={handle} />
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

// Floating labels — purely decorative, no handles
function FloatLabelNode({ data }: NodeProps) {
  const d = data as { text: string };
  return (
    <div
      style={{
        ...font,
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: '#00ff41',
        background: '#0a0a0a',
        border: '1px solid rgba(0,255,65,0.5)',
        padding: '3px 10px',
        borderRadius: '20px',
        whiteSpace: 'nowrap' as const,
        pointerEvents: 'none',
        userSelect: 'none' as const,
        boxShadow: '0 0 8px rgba(0,255,65,0.12)',
      }}
    >
      {d.text}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  decisionNode: DecisionNode,
  standardNode: StandardNode,
  envNode: EnvNode,
  productionNode: ProductionNode,
  floatLabel: FloatLabelNode,
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


// ── Graph definition ──────────────────────────────────────────
//
// Bounding box: x = [0, 730]  →  visual centre = 365
// Every column has a uniform width so same-column handles share one x.
//
//  Left branch  (w=260, x=  0): handle centre x=130
//  Right branch (w=240, x=490): handle centre x=610
//  Centre start (w=140, x=295): handle centre x=365
//  Centre decision (w=160, h=92, x=285): handle centre x=365
//  Post-merge   (w=290, x=220): handle centre x=365
//  Production   (w=390, x=170): handle centre x=365
//
const initialNodes: Node[] = [
  // ── Centre column ──────────────────────────────────────────
  {
    id: 'start',
    type: 'startNode',
    position: { x: 295, y: 0 },
    style: { width: '140px' },
    data: {},
  },
  {
    id: 'decision',
    type: 'decisionNode',
    position: { x: 285, y: 72 },
    style: { width: '160px', height: '92px' },
    data: { label: 'Work Type?' },
  },
  // Floating branch labels — same y, flanking the diamond exits
  {
    id: 'lbl_claude',
    type: 'floatLabel',
    position: { x: 140, y: 109 },
    selectable: false,
    data: { text: 'Claude Code' },
  },
  {
    id: 'lbl_manual',
    type: 'floatLabel',
    position: { x: 458, y: 109 },
    selectable: false,
    data: { text: 'Manual Dev' },
  },

  // ── Left branch (Claude Code) — x=0, w=260, centre at 130
  {
    id: 'push_feature',
    type: 'standardNode',
    position: { x: 0, y: 222 },
    style: { width: '260px' },
    data: { beforeCode: 'Push to ', codePart: 'feature/*', afterCode: ' branch' },
  },
  {
    id: 'cf_preview',
    type: 'envNode',
    position: { x: 0, y: 308 },
    style: { width: '260px' },
    data: { label: 'Cloudflare Preview Instance', dotColor: '#f38020' },
  },
  {
    id: 'test_review',
    type: 'standardNode',
    position: { x: 0, y: 394 },
    style: { width: '260px' },
    data: { label: 'Test & Review Preview' },
  },
  {
    id: 'merge_dev',
    type: 'standardNode',
    position: { x: 0, y: 480 },
    style: { width: '260px' },
    data: { beforeCode: 'Merge into ', codePart: 'dev' },
  },

  // ── Right branch (Manual Dev) — x=490, w=240, centre at 610
  // y=480 matches merge_dev so both convergence edges are symmetric
  {
    id: 'push_dev',
    type: 'standardNode',
    position: { x: 490, y: 480 },
    style: { width: '240px' },
    data: { beforeCode: 'Push directly to ', codePart: 'dev' },
  },

  // ── Centre column (converge) — x=220, w=290, centre at 365
  {
    id: 'cf_staging',
    type: 'envNode',
    position: { x: 220, y: 600 },
    style: { width: '290px' },
    data: { label: 'Cloudflare Staging Instance', dotColor: '#f38020' },
  },
  {
    id: 'validate',
    type: 'standardNode',
    position: { x: 220, y: 686 },
    style: { width: '290px' },
    data: { label: 'Validate Staging' },
  },
  {
    id: 'merge_main',
    type: 'standardNode',
    position: { x: 220, y: 772 },
    style: { width: '290px' },
    data: { beforeCode: 'Merge into ', codePart: 'main' },
  },
  {
    id: 'gh_actions',
    type: 'envNode',
    position: { x: 220, y: 858 },
    style: { width: '290px' },
    data: { label: 'GitHub Actions → Deploy', dotColor: '#00ff41' },
  },
  {
    id: 'production',
    type: 'productionNode',
    position: { x: 170, y: 944 },
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
  // Decision → left branch (Claude Code) — label is a floatLabel node
  {
    id: 'e-decision-feature',
    source: 'decision',
    sourceHandle: 'left',
    target: 'push_feature',
    type: 'smoothstep',
    style: edgeStyle,
    markerEnd: arrow,
  },
  // Decision → right branch (Manual Dev) — label is a floatLabel node
  {
    id: 'e-decision-dev',
    source: 'decision',
    sourceHandle: 'right',
    target: 'push_dev',
    type: 'smoothstep',
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
