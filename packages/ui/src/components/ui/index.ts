/**
 * AegisLab Rosetta UI — primitive barrel.
 *
 * Add a new primitive ⇒ register it here so app code can `import { X } from
 * '@/components/ui'` without knowing the file layout.
 */

export { Button, ButtonLink } from './Button';
export { Panel } from './Panel';
export type { PanelElevation, PanelSurface, PanelVariant } from './Panel';
export { PanelTitle } from './PanelTitle';
export { AmbientBackground } from './AmbientBackground';
export type {
  AmbientBackgroundProps,
  AmbientBackgroundVariant,
} from './AmbientBackground';
export { Reveal } from './Reveal';
export type { RevealProps } from './Reveal';
export { Markdown } from './Markdown';
export type { MarkdownProps } from './Markdown';
export { MdxDocument } from './MdxDocument';
export type { MdxDocumentProps } from './MdxDocument';
export { mdxTableOfContents } from './mdxTableOfContents';
export type { MdxTocEntry } from './mdxTableOfContents';
export { MetricLabel } from './MetricLabel';
export { MonoValue } from './MonoValue';
export type { MonoValueSurface } from './MonoValue';
export { StatusDot } from './StatusDot';
export { Terminal } from './Terminal';
export type { TerminalLine, LogLevel, TerminalSurface } from './Terminal';
export { BlastRadiusBar } from './BlastRadiusBar';
export type { BlastRadiusBarSurface } from './BlastRadiusBar';
export { ControlListItem } from './ControlListItem';
export { Chip } from './Chip';
export type { ChipSurface } from './Chip';
export { Checkbox } from './Checkbox';
export { Collapse } from './Collapse';
export type { CollapseItem } from './Collapse';
export { Alert } from './Alert';
export { Pagination } from './Pagination';
export { Select } from './Select';
export type { SelectOption } from './Select';
export { RankBar } from './RankBar';
export type { RankBarItem } from './RankBar';
export { ScoreBar } from './ScoreBar';
export { RunPips } from './RunPips';
export type { RunPipsCounts } from './RunPips';
export { ParetoChart } from './ParetoChart';
export type { ParetoLegendItem, ParetoPoint } from './ParetoChart';
export { CheckGrid } from './CheckGrid';
export type {
  CheckGridCell,
  CheckGridColumn,
  CheckGridProps,
  CheckGridRow,
} from './CheckGrid';
export { StackedBar } from './StackedBar';
export type {
  StackedBarColor,
  StackedBarProps,
  StackedBarRow,
  StackedBarSeries,
} from './StackedBar';
export { ColumnLayout } from './ColumnLayout';
export { PickerField } from './PickerField';
export { Dialog } from './Dialog';
export { SectionDivider } from './SectionDivider';
export { KeyValueList } from './KeyValueList';
export type { KeyValueItem, KeyValueListSurface } from './KeyValueList';
export { StatBlock } from './StatBlock';
export type { StatBlockSurface } from './StatBlock';
export { SparkLine } from './SparkLine';
export type { SparkLineSurface } from './SparkLine';
export { MetricCard } from './MetricCard';
export type { MetricCardSurface } from './MetricCard';
export { TrajectoryStep } from './TrajectoryStep';
export type {
  TrajectoryStepData,
  TrajectoryStepSection,
  TrajectoryStepSurface,
} from './TrajectoryStep';
export { TrajectoryTimeline } from './TrajectoryTimeline';
export type {
  TrajectoryTimelineProps,
  TrajectoryTimelineSurface,
} from './TrajectoryTimeline';
export { ToolCallCard } from './ToolCallCard';
export type { ToolCallData, ToolCallCardSurface } from './ToolCallCard';
export { EmptyState } from './EmptyState';
export { Skeleton, SkeletonText } from './Skeleton';
export { TimeDisplay } from './TimeDisplay';
export { CodeBlock } from './CodeBlock';
export type { CodeBlockSurface } from './CodeBlock';
export { FileTree } from './FileTree';
export type { FileTreeFile, FileTreeProps } from './FileTree';
export {
  ContentInspectorDialog,
  ContentPreview,
} from './ContentInspectorDialog';
export type {
  ContentInspectorDialogProps,
  ContentPreviewProps,
} from './ContentInspectorDialog';
export { prepareInspectableContent } from './ContentInspectorContent';
export type {
  InspectableContent,
  InspectableContentKind,
  PreparedInspectableContent,
} from './ContentInspectorContent';
export {
  SessionRunOutputView,
  SessionRunTrajectoryView,
} from './SessionRunView';
export type {
  SessionRunFact,
  SessionRunMessage,
  SessionRunOutputViewProps,
  SessionRunSubmission,
  SessionRunSummary,
  SessionRunToolCall,
  SessionRunTrajectoryViewProps,
} from './SessionRunView';
export { DataTable } from './DataTable';
export type {
  DataTableCellTone,
  DataTableColumn,
  DataTablePagination,
  DataTableSurface,
} from './DataTable';
export { EventTable } from './EventTable';
export type { EventTableColumn, EventTableProps } from './EventTable';
export { DataList } from './DataList';
export type { DataListColumn, DataListItem, DataListSurface } from './DataList';
export { Toolbar } from './Toolbar';
export type { FilterChip, ToolbarProps } from './Toolbar';
export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';
export { QueryAutocomplete } from './QueryAutocomplete';
export type {
  QueryAutocompleteFieldSuggestion,
  QueryAutocompleteProps,
  QueryAutocompleteValueSuggestion,
} from './QueryAutocomplete';
export { MetadataList } from './MetadataList';
export type { MetadataEntry, MetadataListProps } from './MetadataList';
export { ObjectInspector } from './ObjectInspector';
export type {
  ObjectInspectorProps,
  ObjectInspectorTab,
} from './ObjectInspector';
export { Tabs } from './Tabs';
export type { TabItem } from './Tabs';
export { Carousel } from './Carousel';
export type { CarouselProps, CarouselSlide } from './Carousel';
export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbItem } from './Breadcrumb';
export { TableOfContents } from './TableOfContents';
export type {
  TableOfContentsItem,
  TableOfContentsProps,
} from './TableOfContents';
export { Avatar } from './Avatar';
export type { AvatarColorSlot, AvatarSurface } from './Avatar';
export { IdentityCell } from './IdentityCell';
export type { LinkComponent } from './linkComponent';
export { DropdownMenu } from './DropdownMenu';
export type { DropdownItem } from './DropdownMenu';
export { PageSizeSelect } from './PageSizeSelect';
export type { PageSizeSelectProps } from './PageSizeSelect';
export { ProjectSelector } from './ProjectSelector';
export type { ProjectOption } from './ProjectSelector';
export { PageHeader } from './PageHeader';
export { SettingsSection } from './SettingsSection';
export { FormRow } from './FormRow';
export { DangerZone } from './DangerZone';
export { ThemeToggle } from './ThemeToggle';
export { TextField } from './TextField';
export { PasswordField } from './PasswordField';
export { AuthLayout } from './AuthLayout';
export { LoginForm } from './LoginForm';
export { RegisterForm } from './RegisterForm';
export { ForgotPasswordForm } from './ForgotPasswordForm';
export { ErrorState } from './ErrorState';
export { NotificationBell } from './NotificationBell';
export { InboxPage } from './InboxPage';
export type { InboxPageSurface } from './InboxPage';
export { CommandPalette } from './CommandPalette';
export { ChatMessage } from './ChatMessage';
export type { ChatMessageSurface } from './ChatMessage';
export { ChatMessageList } from './ChatMessageList';
export type { ChatMessageListSurface } from './ChatMessageList';
export { ChatComposer } from './ChatComposer';
export { ChatSessionList } from './ChatSessionList';
export type { ChatSessionItem, ChatSessionListProps } from './ChatSessionList';
export { CommandInvocationCard } from './CommandInvocationCard';
export type { CommandInvocationCardSurface } from './CommandInvocationCard';
export { AgentPanel } from './AgentPanel';
export type { AgentPanelSurface } from './AgentPanel';
export { FileDropzone } from './FileDropzone';
export type { FileDropzoneItem } from './FileDropzone';
export { FolderDropzone } from './FolderDropzone';
export type { FolderDropzoneProps } from './FolderDropzone';
export { FilePreview } from './FilePreview';
export type { FilePreviewSurface } from './FilePreview';
export { CodeEditor } from './CodeEditor';
export type {
  CodeEditorField,
  CodeEditorLanguage,
  CodeEditorSurface,
} from './CodeEditor';
export { DiffViewer } from './DiffViewer';
export type { DiffViewerSurface } from './DiffViewer';
export { Timeline } from './Timeline';
export type { TimelineItem, TimelineSurface } from './Timeline';
export { ParquetViewer } from './ParquetViewer';
export type { ParquetViewerSurface } from './ParquetViewer';
export { TraceTree } from './TraceTree';
export type { TraceSpan, TraceTreeSurface } from './TraceTree';
export { TraceSpanInspector } from './TraceSpanInspector';
export type { TraceSpanInspectorProps } from './TraceSpanInspector';
export { TimelineChart } from './TimelineChart';
export type { TimelineChartProps, TimelineSpan } from './TimelineChart';
export { BucketCard } from './BucketCard';
export { ObjectBrowser } from './ObjectBrowser';
export { ShareLinkDialog } from './ShareLinkDialog';
export type { ShareLinkOptions, ShareLinkResult } from './ShareLinkDialog';
export { UploadQueue } from './UploadQueue';
export { ResizableSidePanel } from './ResizableSidePanel';
export type { ResizableSidePanelProps } from './ResizableSidePanel';
export { EnvironmentSwitcher } from './EnvironmentSwitcher';
export type {
  EnvironmentSwitcherBadge,
  EnvironmentSwitcherOption,
  EnvironmentSwitcherProps,
} from './EnvironmentSwitcher';
export { TimeRangePicker } from './TimeRangePicker';
export type { TimeRangePickerProps } from './TimeRangePicker';
export { ServiceMap } from './ServiceMap';
export type {
  ServiceMapDirection,
  ServiceMapEdge,
  ServiceMapNode,
  ServiceMapProps,
  ServiceMapStatus,
} from './ServiceMap';
export { SavedQueryBar } from './SavedQueryBar';
export type { SavedQueryBarProps } from './SavedQueryBar';
