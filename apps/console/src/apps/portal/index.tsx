import {
  AppstoreOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  HddOutlined,
  PlayCircleOutlined,
  ProfileOutlined,
  ProjectOutlined,
  RobotOutlined,
  SafetyOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

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
import EvalRunCreate from './pages/EvalRunCreate';
import EvalRunDetail from './pages/EvalRunDetail';
import EvalRuns from './pages/EvalRuns';
import ExecutionCreate from './pages/ExecutionCreate';
import ExecutionDetail from './pages/ExecutionDetail';
import Executions from './pages/Executions';
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
  sidebar: [
    {
      label: 'Workspace',
      items: [
        { to: '', label: 'Dashboard', icon: <DashboardOutlined />, end: true },
        { to: 'projects', label: 'Projects', icon: <ProjectOutlined /> },
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
        { to: 'tasks', label: 'Tasks', icon: <PlayCircleOutlined /> },
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
    { path: 'projects', element: <Projects /> },
    { path: 'projects/new', element: <ProjectCreate /> },
    {
      path: 'projects/:projectId',
      children: [
        { path: '', element: <ProjectOverview /> },
        { path: 'overview', element: <ProjectOverview /> },
        { path: 'injections', element: <Injections /> },
        { path: 'injections/new', element: <InjectionCreate /> },
        { path: 'injections/:injectionId', element: <InjectionDetail /> },
        { path: 'executions', element: <Executions /> },
        { path: 'executions/new', element: <ExecutionCreate /> },
        { path: 'executions/:executionId', element: <ExecutionDetail /> },
        { path: 'traces', element: <Traces /> },
        { path: 'traces/:traceId', element: <TraceDetail /> },
        { path: 'observations', element: <Observations /> },
        { path: 'metrics', element: <MetricsPage /> },
      ],
    },
    { path: 'containers', element: <Containers /> },
    { path: 'containers/new', element: <ContainerCreate /> },
    { path: 'containers/:containerId', element: <ContainerDetail /> },
    { path: 'datasets', element: <Datasets /> },
    { path: 'datasets/new', element: <DatasetCreate /> },
    { path: 'datasets/:datasetId', element: <DatasetDetail /> },
    { path: 'labels', element: <Labels /> },
    { path: 'labels/new', element: <LabelCreate /> },
    { path: 'labels/:labelId', element: <LabelDetail /> },
    { path: 'tasks', element: <Tasks /> },
    { path: 'tasks/:taskId', element: <TaskDetail /> },
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
    { path: 'cluster', element: <ClusterStatus /> },
  ],
};
