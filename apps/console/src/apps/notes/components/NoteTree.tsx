import { type TreeDataNode, Tree } from 'antd';
import { type Key, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { noteUrl } from '../lib/routes';
import type { NoteFile } from '../lib/slug-index';

interface NoteTreeProps {
  files: NoteFile[];
  currentPath: string;
  /** Called after a note is selected (used to close the mobile drawer). */
  onSelect?: () => void;
}

interface BuildNode {
  name: string;
  path: string;
  isFile: boolean;
  children: Map<string, BuildNode>;
}

const DIR_PREFIX = 'dir:';

function buildTree(files: NoteFile[]): TreeDataNode[] {
  const root = new Map<string, BuildNode>();
  for (const file of files) {
    const parts = file.path.split('/');
    let level = root;
    let acc = '';
    parts.forEach((part, idx) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = idx === parts.length - 1;
      let node = level.get(part);
      if (!node) {
        node = { name: part, path: acc, isFile, children: new Map() };
        level.set(part, node);
      }
      level = node.children;
    });
  }
  return toDataNodes(root);
}

function toDataNodes(level: Map<string, BuildNode>): TreeDataNode[] {
  const nodes = Array.from(level.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
  return nodes.map((node) => {
    if (node.isFile) {
      return {
        key: node.path,
        title: node.name.replace(/\.md$/i, ''),
        isLeaf: true,
      };
    }
    return {
      key: `${DIR_PREFIX}${node.path}`,
      title: node.name,
      selectable: false,
      children: toDataNodes(node.children),
    };
  });
}

function ancestorDirKeys(path: string): string[] {
  const parts = path.split('/');
  parts.pop();
  const keys: string[] = [];
  let acc = '';
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    keys.push(`${DIR_PREFIX}${acc}`);
  }
  return keys;
}

export function NoteTree({ files, currentPath, onSelect }: NoteTreeProps): JSX.Element {
  const navigate = useNavigate();
  const treeData = useMemo(() => buildTree(files), [files]);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

  useEffect(() => {
    if (currentPath) {
      setExpandedKeys((prev) =>
        Array.from(new Set([...prev, ...ancestorDirKeys(currentPath)])),
      );
    }
  }, [currentPath]);

  return (
    <Tree
      blockNode
      showLine
      treeData={treeData}
      selectedKeys={currentPath ? [currentPath] : []}
      expandedKeys={expandedKeys}
      onExpand={(keys) => setExpandedKeys(keys)}
      onSelect={(keys) => {
        const key = keys[0];
        if (typeof key === 'string' && !key.startsWith(DIR_PREFIX)) {
          navigate(noteUrl(key));
          onSelect?.();
        }
      }}
    />
  );
}
