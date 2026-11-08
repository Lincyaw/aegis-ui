import { type ReactNode, useId, useState } from 'react';

import {
  CloseOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { Drawer } from 'antd';

import { useStrings } from '../../locale';
import { MetricLabel } from './MetricLabel';
import './ObjectInspector.css';
import { Tabs } from './Tabs';
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
  /**
   * The tab shown first, and again whenever it changes, e.g. when the host
   * opens another object. Without it, the first enabled tab. A tab the reader
   * picks holds until then, while it is still an enabled tab.
   */
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
  const strings = useStrings();
  const panelId = useId();
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const [pickedUnder, setPickedUnder] = useState(defaultTabId);
  if (pickedUnder !== defaultTabId) {
    setPickedUnder(defaultTabId);
    setPickedId(undefined);
  }

  const enabledTabs = tabs.filter((t) => t.disabled !== true);
  const activeTab =
    enabledTabs.find((t) => t.id === pickedId) ??
    enabledTabs.find((t) => t.id === defaultTabId) ??
    (enabledTabs.length > 0 ? enabledTabs[0] : undefined);

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
                maximized ? strings.restoreInspector : strings.maximizeInspector
              }
              title={maximized ? strings.restore : strings.maximize}
            >
              {maximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>
            <button
              type="button"
              className="aegis-object-inspector__close"
              onClick={onClose}
              aria-label={strings.closeInspector}
            >
              <CloseOutlined />
            </button>
          </div>
        </header>

        {actions !== undefined ? (
          <div className="aegis-object-inspector__actions">
            <Toolbar left={actions} />
          </div>
        ) : null}

        {tabs.length > 0 ? (
          <div className="aegis-object-inspector__tabs">
            <Tabs
              listOnly
              ariaLabel={strings.inspectorTabs}
              panelId={panelId}
              items={tabs.map((tab) => ({
                key: tab.id,
                label: tab.label,
                disabled: tab.disabled,
                hint: tab.disabled === true ? tab.hint : undefined,
              }))}
              activeKey={activeTab?.id ?? ''}
              onChange={setPickedId}
            />
          </div>
        ) : null}

        <div
          id={panelId}
          className="aegis-object-inspector__body"
          role={activeTab ? 'tabpanel' : undefined}
          aria-label={activeTab?.label}
        >
          {activeTab?.content}
        </div>
      </div>
    </Drawer>
  );
}
