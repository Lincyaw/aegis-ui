import { type ReactNode, useState } from 'react';

import {
  CloseOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { Drawer } from 'antd';

import { MetricLabel } from './MetricLabel';
import './ObjectInspector.css';
import { Toolbar } from './Toolbar';

export interface ObjectInspectorTab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  /** Shown when tab is disabled. */
  hint?: string;
}

export interface ObjectInspectorProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tabs: ObjectInspectorTab[];
  defaultTabId?: string;
  /** Row of action buttons (Download / Copy URL / Share / Delete). */
  actions?: ReactNode;
  /** Default: 720 */
  width?: number | string;
  /** Width when the inspector is maximized. Default: '100vw' */
  maximizedWidth?: number | string;
  /** Start maximized. Default: false */
  defaultMaximized?: boolean;
}

export function ObjectInspector({
  open,
  onClose,
  title,
  subtitle,
  tabs,
  defaultTabId,
  actions,
  width = 720,
  maximizedWidth = '100vw',
  defaultMaximized = false,
}: ObjectInspectorProps) {
  const [maximized, setMaximized] = useState<boolean>(defaultMaximized);
  function resolveInitialTabId(): string {
    if (defaultTabId !== undefined) {
      return defaultTabId;
    }
    const firstEnabled = tabs.find((t) => !t.disabled);
    if (firstEnabled !== undefined) {
      return firstEnabled.id;
    }
    return tabs[0]?.id ?? '';
  }
  const [activeId, setActiveId] = useState<string>(resolveInitialTabId);

  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={maximized ? maximizedWidth : width}
      placement="right"
      closable={false}
      className="aegis-object-inspector__drawer"
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
        header: { display: 'none' },
      }}
    >
      <div className="aegis-object-inspector">
        {/* Header */}
        <header className="aegis-object-inspector__header">
          <div className="aegis-object-inspector__header-text">
            <span className="aegis-object-inspector__title">{title}</span>
            {subtitle !== undefined ? (
              <MetricLabel className="aegis-object-inspector__subtitle">
                {subtitle}
              </MetricLabel>
            ) : null}
          </div>
          <div className="aegis-object-inspector__header-buttons">
            <button
              type="button"
              className="aegis-object-inspector__close"
              onClick={() => {
                setMaximized((m) => !m);
              }}
              aria-label={
                maximized ? 'Restore inspector' : 'Maximize inspector'
              }
              title={maximized ? 'Restore' : 'Maximize'}
            >
              {maximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>
            <button
              type="button"
              className="aegis-object-inspector__close"
              onClick={onClose}
              aria-label="Close inspector"
            >
              <CloseOutlined />
            </button>
          </div>
        </header>

        {/* Actions */}
        {actions !== undefined ? (
          <div className="aegis-object-inspector__actions">
            <Toolbar left={actions} />
          </div>
        ) : null}

        {/* Tabs */}
        <div
          className="aegis-object-inspector__tablist"
          role="tablist"
          aria-label="Inspector tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === activeId}
              aria-disabled={tab.disabled}
              disabled={tab.disabled}
              className={[
                'aegis-object-inspector__tab',
                tab.id === activeId
                  ? 'aegis-object-inspector__tab--active'
                  : '',
                tab.disabled ? 'aegis-object-inspector__tab--disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={tab.disabled ? tab.hint : undefined}
              onClick={() => {
                if (!tab.disabled) {
                  setActiveId(tab.id);
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="aegis-object-inspector__body" role="tabpanel">
          {activeTab?.content}
        </div>
      </div>
    </Drawer>
  );
}

export default ObjectInspector;
