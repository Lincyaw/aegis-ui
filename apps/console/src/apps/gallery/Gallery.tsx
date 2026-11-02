import { MetricLabel, PanelTitle } from '@lincyaw/aegis-ui';

import { AgentSection } from './sections/Agent';
import { AgentIntegrationSection } from './sections/AgentIntegration';
import { AgentTrajectorySection } from './sections/AgentTrajectory';
import { AntdWidgetsSection } from './sections/AntdWidgets';
import { ColorTokensSection } from './sections/ColorTokens';
import { CommandsSection } from './sections/Commands';
import { DataDisplaySection } from './sections/DataDisplay';
import { IndicatorsSection } from './sections/Indicators';
import { LayoutsSection } from './sections/Layouts';
import { ListsRowsSection } from './sections/ListsRows';
import { LogsSection } from './sections/Logs';
import { NavigationSection } from './sections/Navigation';
import { NotificationsSection } from './sections/Notifications';
import { ServicePrimitivesSection } from './sections/ServicePrimitives';
import { ShapeMotionSection } from './sections/ShapeMotion';
import { SiteChartsSection } from './sections/SiteCharts';
import { SurfacesSection } from './sections/Surfaces';
import { TablesSection } from './sections/Tables';
import { TypographySection } from './sections/Typography';

import './Gallery.css';

export default function Gallery() {
  return (
    <div className='gallery'>
      <header className='gallery__header'>
        <div>
          <PanelTitle size='hero' as='h1'>
            Aegis Rosetta
          </PanelTitle>
          <MetricLabel as='div' className='gallery__header-tag'>
            UI System Specimen · v0
          </MetricLabel>
        </div>
        <p className='gallery__intro'>
          Cool, very light surfaces and soft near-black ink, one brand blue,
          glass layered over a faint ambient wash, pill controls. Hanken Grotesk
          sets text and numbers; Google Sans Code sets ids, paths and code.
          Activation is surface inversion; anomaly red marks real failures only.
        </p>
      </header>
      <ColorTokensSection />
      <TypographySection />
      <ShapeMotionSection />
      <SurfacesSection />
      <IndicatorsSection />
      <SiteChartsSection />
      <DataDisplaySection />
      <ListsRowsSection />
      <TablesSection />
      <AgentTrajectorySection />
      <LogsSection />
      <NavigationSection />
      <LayoutsSection />
      <NotificationsSection />
      <AgentSection />
      <ServicePrimitivesSection />
      <AntdWidgetsSection />
      <CommandsSection />
      <AgentIntegrationSection />
      <footer className='gallery__footer'>
        <MetricLabel as='div'>
          aegis · rosetta · ui specimen · review only
        </MetricLabel>
      </footer>
    </div>
  );
}
