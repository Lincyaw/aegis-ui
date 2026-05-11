import {
  AppstoreOutlined,
  DashboardOutlined,
  HddOutlined,
  PlayCircleOutlined,
  ProfileOutlined,
  ProjectOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import type { AegisApp } from '@OperationsPAI/aegis-ui';

import ContainerCreate from './pages/ContainerCreate';
import ContainerDetail from './pages/ContainerDetail';
import Containers from './pages/Containers';
import Dashboard from './pages/Dashboard';
import DatasetCreate from './pages/DatasetCreate';
import DatasetDetail from './pages/DatasetDetail';
import Datasets from './pages/Datasets';
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
import ProjectCreate from './pages/ProjectCreate';
import ProjectOverview from './pages/ProjectOverview';
import Projects from './pages/Projects';
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
      items: [
        { to: '', label: 'Dashboard', icon: <DashboardOutlined />, end: true },
        { to: 'projects', label: 'Projects', icon: <ProjectOutlined /> },
        { to: 'containers', label: 'Containers', icon: <HddOutlined /> },
        { to: 'datasets', label: 'Datasets', icon: <ProfileOutlined /> },
        { to: 'labels', label: 'Labels', icon: <TagsOutlined /> },
        { to: 'tasks', label: 'Tasks', icon: <PlayCircleOutlined /> },
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
  ],
};
