import {
  AppstoreOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileProtectOutlined,
  FundOutlined,
  HddOutlined,
  NodeIndexOutlined,
  PlayCircleOutlined,
  ProfileOutlined,
  RobotOutlined,
  SafetyOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import { LegacyProjectRedirect } from './components/LegacyProjectRedirect';
import { ProjectSwitcher } from './components/ProjectSwitcher';

import ClusterStatus from './pages/ClusterStatus';
import ContainerCreate from './pages/ContainerCreate';
import ContainerDetail from './pages/ContainerDetail';
import Containers from './pages/Containers';
import ContractDetail from './pages/ContractDetail';
import Contracts from './pages/Contracts';
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
import BatchInjections from './pages/BatchInjections';
import InjectionCreate from './pages/InjectionCreate';
import InjectionDetail from './pages/InjectionDetail';
import Injections from './pages/Injections';
import LabelCreate from './pages/LabelCreate';
import LabelDetail from './pages/LabelDetail';
import Labels from './pages/Labels';
import MetricsPage from './pages/MetricsPage';
import Observations from './pages/Observations';
import PedestalDetail from './pages/PedestalDetail';
import PedestalInstall from './pages/PedestalInstall';
import Pedestals from './pages/Pedestals';
import ProjectCreate from './pages/ProjectCreate';
import ProjectOverview from './pages/ProjectOverview';
import Projects from './pages/Projects';
import RegressionDetail from './pages/RegressionDetail';
import RegressionRun from './pages/RegressionRun';
import Regressions from './pages/Regressions';
import SystemDetail from './pages/SystemDetail';
import SystemRegister from './pages/SystemRegister';
import Systems from './pages/Systems';
import TaskDetail from './pages/TaskDetail';
import Tasks from './pages/Tasks';
import TraceDetail from './pages/TraceDetail';
import Traces from './pages/Traces';

import './pages/pages.css';

export const portalApp: AegisApp = {
  id: 'portal',
  label: 'AegisLab',
  description:
    'Root scenarios — projects, containers, datasets, experiments, observability.',
  icon: <AppstoreOutlined />,
  basePath: '/portal',
  header: <ProjectSwitcher />,
  sidebar: [
    {
      label: 'Workspace',
      items: [
        { to: '', label: 'Dashboard', icon: <DashboardOutlined />, end: true },
        { to: 'injections', label: 'Injections', icon: <PlayCircleOutlined /> },
        { to: 'tasks', label: 'Tasks', icon: <NodeIndexOutlined /> },
        { to: 'traces', label: 'Traces', icon: <FundOutlined /> },
        { to: 'observations', label: 'Observations', icon: <EyeOutlined /> },
        { to: 'metrics', label: 'Metrics', icon: <FundOutlined /> },
        { to: 'executions', label: 'Executions', icon: <PlayCircleOutlined /> },
      ],
    },
    {
      label: 'Assets',
      items: [
        { to: 'containers', label: 'Containers', icon: <HddOutlined /> },
        { to: 'datasets', label: 'Datasets', icon: <ProfileOutlined /> },
        { to: 'labels', label: 'Labels', icon: <TagsOutlined /> },
      ],
    },
    {
      label: 'Execution & Eval',
      items: [
        { to: 'regression', label: 'Regression', icon: <ExperimentOutlined /> },
        { to: 'eval', label: 'LLM Eval', icon: <RobotOutlined /> },
      ],
    },
    {
      label: 'Platform',
      items: [
        { to: 'systems', label: 'Systems', icon: <DeploymentUnitOutlined /> },
        { to: 'pedestals', label: 'Pedestals', icon: <SafetyOutlined /> },
        { to: 'contracts', label: 'Contracts', icon: <FileProtectOutlined /> },
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
    { path: 'injections/:injectionId', element: <InjectionDetail /> },
    { path: 'executions', element: <Executions /> },
    { path: 'executions/new', element: <ExecutionCreate /> },
    { path: 'executions/:executionId', element: <ExecutionDetail /> },
    { path: 'traces', element: <Traces /> },
    { path: 'traces/:traceId', element: <TraceDetail /> },
    { path: 'tasks', element: <Tasks /> },
    { path: 'tasks/:taskId', element: <TaskDetail /> },
    { path: 'observations', element: <Observations /> },
    { path: 'metrics', element: <MetricsPage /> },

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
    { path: 'containers', element: <Containers /> },
    { path: 'containers/new', element: <ContainerCreate /> },
    { path: 'containers/:containerId', element: <ContainerDetail /> },
    { path: 'datasets', element: <Datasets /> },
    { path: 'datasets/new', element: <DatasetCreate /> },
    { path: 'datasets/:datasetId', element: <DatasetDetail /> },
    { path: 'labels', element: <Labels /> },
    { path: 'labels/new', element: <LabelCreate /> },
    { path: 'labels/:labelId', element: <LabelDetail /> },

    // Platform
    { path: 'systems', element: <Systems /> },
    { path: 'systems/new', element: <SystemRegister /> },
    { path: 'systems/:code', element: <SystemDetail /> },
    { path: 'pedestals', element: <Pedestals /> },
    { path: 'pedestals/new', element: <PedestalInstall /> },
    { path: 'pedestals/:id', element: <PedestalDetail /> },
    { path: 'contracts', element: <Contracts /> },
    { path: 'contracts/:id', element: <ContractDetail /> },
    { path: 'regression', element: <Regressions /> },
    { path: 'regression/new', element: <RegressionRun /> },
    { path: 'regression/:caseName', element: <RegressionDetail /> },
    { path: 'eval', element: <EvalRuns /> },
    { path: 'eval/new', element: <EvalRunCreate /> },
    { path: 'eval/:runId', element: <EvalRunDetail /> },
    { path: 'eval/:runId/cases/:caseId', element: <EvalCaseDetail /> },
    { path: 'cluster', element: <ClusterStatus /> },
  ],
};
