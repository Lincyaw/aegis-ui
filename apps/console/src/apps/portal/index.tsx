import {
  AppstoreOutlined,
  ClusterOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  ProfileOutlined,
  RobotOutlined,
  SafetyOutlined,
  TagsOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';
import { ContainerType } from '@lincyaw/portal';

import { InjectionDrillRedirect } from './components/InjectionDrillRedirect';
import { LegacyProjectRedirect } from './components/LegacyProjectRedirect';
import { ProjectSwitcher } from './components/ProjectSwitcher';
import BatchInjections from './pages/BatchInjections';
import ClusterStatus from './pages/ClusterStatus';
import ContainerCreate from './pages/ContainerCreate';
import ContainerDetail from './pages/ContainerDetail';
import Containers from './pages/Containers';
import Dashboard from './pages/Dashboard';
import DatasetCreate from './pages/DatasetCreate';
import DatasetDetail from './pages/DatasetDetail';
import Datasets from './pages/Datasets';
import EvalCaseDetail from './pages/EvalCaseDetail';
import EvalRunCreate from './pages/EvalRunCreate';
import EvalRunDetail from './pages/EvalRunDetail';
import EvalRuns from './pages/EvalRuns';
import ExecutionCreate from './pages/ExecutionCreate';
import ExecutionDetail from './pages/ExecutionDetail';
import Executions from './pages/Executions';
import InjectionCreate from './pages/InjectionCreate';
import InjectionData from './pages/InjectionData';
import InjectionDetailLayout from './pages/InjectionDetailLayout';
import InjectionDetailOverview from './pages/InjectionDetailOverview';
import InjectionProcess from './pages/InjectionProcess';
import Injections from './pages/Injections';
import LabelCreate from './pages/LabelCreate';
import LabelDetail from './pages/LabelDetail';
import Labels from './pages/Labels';
import PedestalDetail from './pages/PedestalDetail';
import PedestalInstall from './pages/PedestalInstall';
import Pedestals from './pages/Pedestals';
import ProjectCreate from './pages/ProjectCreate';
import ProjectOverview from './pages/ProjectOverview';
import Projects from './pages/Projects';
import './pages/pages.css';

export const portalApp: AegisApp = {
  id: 'portal',
  label: 'AegisLab',
  description:
    'Root scenarios — projects, algorithms, datasets, experiments, observability.',
  icon: <AppstoreOutlined />,
  basePath: '/portal',
  header: <ProjectSwitcher />,
  sidebar: [
    {
      label: 'Workspace',
      items: [
        { to: '', label: 'Dashboard', icon: <DashboardOutlined />, end: true },
        { to: 'injections', label: 'Injections', icon: <PlayCircleOutlined /> },
        { to: 'executions', label: 'Executions', icon: <PlayCircleOutlined /> },
      ],
    },
    {
      label: 'Assets',
      items: [
        {
          to: 'algorithms',
          label: 'Algorithms',
          icon: <ThunderboltOutlined />,
        },
        {
          to: 'benchmarks',
          label: 'Benchmarks',
          icon: <ExperimentOutlined />,
        },
        { to: 'datasets', label: 'Datasets', icon: <ProfileOutlined /> },
        { to: 'labels', label: 'Labels', icon: <TagsOutlined /> },
      ],
    },
    {
      label: 'Execution & Eval',
      items: [{ to: 'eval', label: 'LLM Eval', icon: <RobotOutlined /> }],
    },
    {
      label: 'Platform',
      items: [
        { to: 'pedestals', label: 'Pedestals', icon: <SafetyOutlined /> },
        { to: 'cluster', label: 'Cluster', icon: <ClusterOutlined /> },
      ],
    },
  ],
  routes: [
    { path: '', element: <Dashboard /> },

    // Project-scoped flat routes
    { path: 'inject', element: <InjectionCreate /> },
    { path: 'injections', element: <Injections /> },
    { path: 'injections/new', element: <InjectionCreate /> },
    { path: 'injections/batch', element: <BatchInjections /> },
    {
      path: 'injections/:injectionId',
      element: <InjectionDetailLayout />,
      children: [
        { index: true, element: <InjectionDetailOverview /> },
        { path: 'process', element: <InjectionProcess /> },
        { path: 'data', element: <InjectionData /> },
      ],
    },
    { path: 'executions', element: <Executions /> },
    { path: 'executions/new', element: <ExecutionCreate /> },
    { path: 'executions/:executionId', element: <ExecutionDetail /> },

    // Legacy injection-drill flat routes — redirect to the new Data tab.
    { path: 'traces', element: <InjectionDrillRedirect target='data' /> },
    { path: 'traces/:traceId', element: <InjectionDrillRedirect target='data' /> },
    {
      path: 'observations',
      element: <InjectionDrillRedirect target='data' />,
    },
    { path: 'metrics', element: <InjectionDrillRedirect target='data' /> },

    // Project management surfaces (still reachable via header dropdown)
    { path: 'projects', element: <Projects /> },
    { path: 'projects/new', element: <ProjectCreate /> },
    { path: 'projects/:projectId', element: <ProjectOverview /> },
    { path: 'projects/:projectId/overview', element: <ProjectOverview /> },

    // Legacy project-nested → flat redirects (preserve old links)
    {
      path: 'projects/:projectId/injections',
      element: <LegacyProjectRedirect to='injections' />,
    },
    {
      path: 'projects/:projectId/injections/new',
      element: <LegacyProjectRedirect to='injections/new' />,
    },
    {
      path: 'projects/:projectId/injections/batch',
      element: <LegacyProjectRedirect to='injections/batch' />,
    },
    {
      path: 'projects/:projectId/injections/:injectionId',
      element: <LegacyProjectRedirect to='injections/:injectionId' />,
    },
    {
      path: 'projects/:projectId/executions',
      element: <LegacyProjectRedirect to='executions' />,
    },
    {
      path: 'projects/:projectId/executions/new',
      element: <LegacyProjectRedirect to='executions/new' />,
    },
    {
      path: 'projects/:projectId/executions/:executionId',
      element: <LegacyProjectRedirect to='executions/:executionId' />,
    },
    {
      path: 'projects/:projectId/traces',
      element: <LegacyProjectRedirect to='traces' />,
    },
    {
      path: 'projects/:projectId/traces/:traceId',
      element: <LegacyProjectRedirect to='traces/:traceId' />,
    },
    {
      path: 'projects/:projectId/observations',
      element: <LegacyProjectRedirect to='observations' />,
    },
    {
      path: 'projects/:projectId/metrics',
      element: <LegacyProjectRedirect to='metrics' />,
    },

    // Assets
    {
      path: 'algorithms',
      element: <Containers containerType={ContainerType.Algorithm} />,
    },
    {
      path: 'algorithms/new',
      element: <ContainerCreate containerType={ContainerType.Algorithm} />,
    },
    {
      path: 'algorithms/:containerId',
      element: <ContainerDetail containerType={ContainerType.Algorithm} />,
    },
    {
      path: 'benchmarks',
      element: <Containers containerType={ContainerType.Benchmark} />,
    },
    {
      path: 'benchmarks/new',
      element: <ContainerCreate containerType={ContainerType.Benchmark} />,
    },
    {
      path: 'benchmarks/:containerId',
      element: <ContainerDetail containerType={ContainerType.Benchmark} />,
    },
    { path: 'datasets', element: <Datasets /> },
    { path: 'datasets/new', element: <DatasetCreate /> },
    { path: 'datasets/:datasetId', element: <DatasetDetail /> },
    { path: 'labels', element: <Labels /> },
    { path: 'labels/new', element: <LabelCreate /> },
    { path: 'labels/:labelId', element: <LabelDetail /> },

    // Platform
    { path: 'pedestals', element: <Pedestals /> },
    { path: 'pedestals/new', element: <PedestalInstall /> },
    { path: 'pedestals/:id', element: <PedestalDetail /> },
    { path: 'eval', element: <EvalRuns /> },
    { path: 'eval/new', element: <EvalRunCreate /> },
    { path: 'eval/:runId', element: <EvalRunDetail /> },
    { path: 'eval/:runId/cases/:caseId', element: <EvalCaseDetail /> },
    { path: 'cluster', element: <ClusterStatus /> },
  ],
};
