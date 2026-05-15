import { create } from 'zustand';

import { seedState } from './seed';
import type {
  MockClusterCheck,
  MockContainer,
  MockDataset,
  MockEvalCase,
  MockEvalRun,
  MockInjection,
  MockLabel,
  MockPedestal,
  MockProject,
  MockRegressionRun,
  MockStoreState,
  MockSystem,
  MockTask,
} from './types';

const nowIso = (): string => new Date().toISOString();
const rand = (prefix: string): string =>
  `${prefix}-${Math.floor(Math.random() * 90000 + 10000)}`;

interface StoreActions {
  createInjection: (input: {
    projectId: string;
    systemCode: string;
    contractId: string;
    blastRadius: MockInjection['blastRadius'];
    durationSec: number;
    intensity: number;
  }) => MockInjection;
  cancelTask: (id: string) => void;
  expediteTask: (id: string) => void;
  cancelInjection: (id: string) => void;
  addInjectionsToDataset: (
    injectionIds: string[],
    opts: { datasetId?: string; newName?: string; description?: string },
  ) => MockDataset;

  installPedestal: (input: {
    systemCode: string;
    version: string;
    namespace: string;
    helmValues: string;
  }) => MockPedestal;
  restartPedestal: (id: string) => void;
  uninstallPedestal: (id: string) => void;
  applyPedestalOverrides: (id: string, helmValues: string) => void;

  registerSystem: (input: Omit<MockSystem, 'pedestalCount' | 'lastInjectionAt'>) => MockSystem;
  enableSystem: (code: string) => void;
  disableSystem: (code: string) => void;

  runRegression: (input: {
    caseId: string;
    systemCode: string;
    datasetId: string;
    concurrency: number;
  }) => MockRegressionRun;

  createEvalRun: (input: {
    model: string;
    datasetId: string;
    nCases: number;
  }) => MockEvalRun;

  createDataset: (input: { name: string; description: string }) => MockDataset;
  createLabel: (input: { name: string; color: string }) => MockLabel;
  createContainer: (input: {
    name: string;
    image: string;
    algorithm: string;
  }) => MockContainer;
  createProject: (input: { name: string; description: string }) => MockProject;

  setTaskStatus: (id: string, status: MockTask['status']) => void;
  setInjectionStatus: (id: string, status: MockInjection['status']) => void;
  setPedestalStatus: (id: string, status: MockPedestal['status']) => void;

  runPreflight: () => void;
  setClusterCheckStatus: (id: string, status: MockClusterCheck['status'], detail?: string) => void;
  appendClusterEvent: (level: 'info' | 'warn' | 'error', body: string) => void;
  setEvalRunStatus: (id: string, status: MockEvalRun['status']) => void;
  setRegressionRunStatus: (id: string, status: MockRegressionRun['status']) => void;
}

type MockStore = MockStoreState & StoreActions;

export const useMockStore = create<MockStore>((set, get) => ({
  ...seedState,

  createInjection: (input) => {
    const id = rand('inj');
    const taskId = rand('task');
    const contract = get().contracts.find((c) => c.id === input.contractId);
    const created: MockInjection = {
      id,
      projectId: input.projectId,
      systemCode: input.systemCode,
      contractId: input.contractId,
      taskId,
      traceId: null,
      blastRadius: input.blastRadius,
      durationSec: input.durationSec,
      intensity: input.intensity,
      status: 'pending',
      createdAt: nowIso(),
      name: `${contract?.name ?? 'fault'}-${input.systemCode}`,
    };
    const task: MockTask = {
      id: taskId,
      kind: 'injection',
      parentId: id,
      parentLabel: id,
      status: 'pending',
      startedAt: nowIso(),
      durationMs: 0,
      logs: [
        { ts: '00:00:00', level: 'info', body: `task spawned for ${id}` },
        { ts: '00:00:00', level: 'info', body: `contract=${contract?.name ?? input.contractId} target=${input.systemCode}` },
      ],
    };
    set((s) => ({ injections: [created, ...s.injections], tasks: [task, ...s.tasks] }));

    setTimeout(() => {
      const traceId = rand('trace');
      set((s) => ({
        injections: s.injections.map((i) =>
          i.id === id ? { ...i, status: 'running', traceId } : i,
        ),
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: 'running' } : t)),
        traces: [
          {
            id: traceId,
            projectId: input.projectId,
            injectionId: id,
            rootOperation: `GET /${input.systemCode}`,
            durationMs: 1200,
            spanCount: 24,
            startedAt: nowIso(),
          },
          ...s.traces,
        ],
      }));
    }, 1500);

    setTimeout(() => {
      const current = get().injections.find((i) => i.id === id);
      if (current && (current.status === 'cancelled' || current.status === 'failed')) {
        return;
      }
      set((s) => ({
        injections: s.injections.map((i) => (i.id === id ? { ...i, status: 'completed' } : i)),
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'completed', durationMs: 4000 } : t,
        ),
      }));
    }, 4000);

    return created;
  },

  cancelTask: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t)),
    }));
  },
  expediteTask: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: 'completed' } : t)),
    }));
  },
  cancelInjection: (id) => {
    set((s) => ({
      injections: s.injections.map((i) => (i.id === id ? { ...i, status: 'cancelled' } : i)),
      tasks: s.tasks.map((t) =>
        t.parentId === id ? { ...t, status: 'cancelled' } : t,
      ),
    }));
  },

  addInjectionsToDataset: (injectionIds, opts) => {
    const existing = opts.datasetId
      ? get().datasets.find((d) => d.id === opts.datasetId)
      : undefined;
    if (existing) {
      const merged: MockDataset = {
        ...existing,
        injectionIds: Array.from(new Set([...existing.injectionIds, ...injectionIds])),
        fileCount: existing.fileCount + injectionIds.length,
        sizeMb: existing.sizeMb + injectionIds.length * 8,
      };
      set((s) => ({
        datasets: s.datasets.map((d) => (d.id === merged.id ? merged : d)),
      }));
      return merged;
    }
    const created: MockDataset = {
      id: rand('ds'),
      name: opts.newName ?? `dataset-${Date.now()}`,
      description: opts.description ?? '',
      injectionIds,
      fileCount: injectionIds.length,
      sizeMb: injectionIds.length * 8,
      createdAt: nowIso(),
    };
    set((s) => ({ datasets: [created, ...s.datasets] }));
    return created;
  },

  installPedestal: (input) => {
    const id = rand('ped');
    const created: MockPedestal = {
      id,
      systemCode: input.systemCode,
      namespace: input.namespace,
      version: input.version,
      status: 'pending',
      age: '0m',
      lastRestartAt: nowIso(),
      helmValues: input.helmValues,
    };
    set((s) => ({
      pedestals: [created, ...s.pedestals],
      systems: s.systems.map((sys) =>
        sys.code === input.systemCode
          ? { ...sys, pedestalCount: sys.pedestalCount + 1 }
          : sys,
      ),
    }));
    setTimeout(() => {
      set((s) => ({
        pedestals: s.pedestals.map((p) => (p.id === id ? { ...p, status: 'running' } : p)),
      }));
    }, 3000);
    return created;
  },
  restartPedestal: (id) => {
    set((s) => ({
      pedestals: s.pedestals.map((p) => (p.id === id ? { ...p, status: 'restarting' } : p)),
    }));
    setTimeout(() => {
      set((s) => ({
        pedestals: s.pedestals.map((p) =>
          p.id === id ? { ...p, status: 'running', lastRestartAt: nowIso(), age: '0m' } : p,
        ),
      }));
    }, 3000);
  },
  uninstallPedestal: (id) => {
    const ped = get().pedestals.find((p) => p.id === id);
    set((s) => ({
      pedestals: s.pedestals.filter((p) => p.id !== id),
      systems: ped
        ? s.systems.map((sys) =>
            sys.code === ped.systemCode
              ? { ...sys, pedestalCount: Math.max(0, sys.pedestalCount - 1) }
              : sys,
          )
        : s.systems,
    }));
  },
  applyPedestalOverrides: (id, helmValues) => {
    set((s) => ({
      pedestals: s.pedestals.map((p) =>
        p.id === id ? { ...p, status: 'restarting', helmValues } : p,
      ),
    }));
    setTimeout(() => {
      set((s) => ({
        pedestals: s.pedestals.map((p) =>
          p.id === id ? { ...p, status: 'running', lastRestartAt: nowIso() } : p,
        ),
      }));
    }, 2500);
  },

  registerSystem: (input) => {
    const created: MockSystem = {
      ...input,
      pedestalCount: 0,
      lastInjectionAt: nowIso(),
    };
    set((s) => ({ systems: [created, ...s.systems] }));
    return created;
  },
  enableSystem: (code) => {
    set((s) => ({
      systems: s.systems.map((sys) => (sys.code === code ? { ...sys, enabled: true } : sys)),
    }));
  },
  disableSystem: (code) => {
    set((s) => ({
      systems: s.systems.map((sys) => (sys.code === code ? { ...sys, enabled: false } : sys)),
    }));
  },

  runRegression: (input) => {
    const id = rand('regrun');
    const childTaskIds: string[] = [];
    const tasksToAdd: MockTask[] = [];
    for (let i = 0; i < input.concurrency; i++) {
      const tid = rand('task');
      childTaskIds.push(tid);
      tasksToAdd.push({
        id: tid,
        kind: 'regression',
        parentId: id,
        parentLabel: input.caseId,
        status: 'pending',
        startedAt: nowIso(),
        durationMs: 0,
        logs: [{ ts: '00:00:00', level: 'info', body: `regression child ${i}` }],
      });
    }
    const created: MockRegressionRun = {
      id,
      caseId: input.caseId,
      systemCode: input.systemCode,
      datasetId: input.datasetId,
      status: 'pending',
      startedAt: nowIso(),
      durationMs: 0,
      childTaskIds,
      passes: 0,
      fails: 0,
    };
    set((s) => ({
      regressionRuns: [created, ...s.regressionRuns],
      tasks: [...tasksToAdd, ...s.tasks],
    }));
    setTimeout(() => {
      set((s) => ({
        regressionRuns: s.regressionRuns.map((r) =>
          r.id === id ? { ...r, status: 'running' } : r,
        ),
        tasks: s.tasks.map((t) =>
          childTaskIds.includes(t.id) ? { ...t, status: 'running' } : t,
        ),
      }));
    }, 1500);
    setTimeout(() => {
      set((s) => ({
        regressionRuns: s.regressionRuns.map((r) =>
          r.id === id
            ? { ...r, status: 'completed', passes: input.concurrency, fails: 0, durationMs: 4000 }
            : r,
        ),
        tasks: s.tasks.map((t) =>
          childTaskIds.includes(t.id) ? { ...t, status: 'completed', durationMs: 4000 } : t,
        ),
      }));
    }, 4000);
    return created;
  },

  createEvalRun: (input) => {
    const id = rand('eval');
    const caseIds: string[] = [];
    const newCases: MockEvalCase[] = [];
    const samplePool = get().injections.slice(0, input.nCases);
    for (let i = 0; i < input.nCases; i++) {
      const cid = rand('evcase');
      caseIds.push(cid);
      const inj = samplePool[i % samplePool.length];
      if (!inj) {
        continue;
      }
      const passed = i % 3 !== 0;
      newCases.push({
        id: cid,
        runId: id,
        injectionId: inj.id,
        traceId: inj.traceId ?? 'trace-7700',
        pattern: passed ? 'path_reachability' : 'symptom_propagation',
        tier: i % 2 === 0 ? 'tier-1' : 'tier-2',
        passed,
        score: passed ? 0.78 : 0.32,
        trajectory: [
          {
            step: 1,
            timestamp: '00:00:01',
            actionType: 'tool_call',
            action: 'query_metrics()',
            observation: 'p99 latency spike detected',
          },
          {
            step: 2,
            timestamp: '00:00:03',
            actionType: 'message',
            action: 'Conclude root cause',
            observation: passed ? '**Root cause** identified.' : '**Inconclusive**.',
          },
        ],
      });
    }
    const created: MockEvalRun = {
      id,
      model: input.model,
      datasetId: input.datasetId,
      nCases: input.nCases,
      status: 'pending',
      tier1Score: 0,
      tier2Score: 0,
      pathReachability: 0,
      completionRate: 0,
      startedAt: nowIso(),
      caseIds,
    };
    set((s) => ({
      evalRuns: [created, ...s.evalRuns],
      evalCases: [...newCases, ...s.evalCases],
    }));
    setTimeout(() => {
      set((s) => ({
        evalRuns: s.evalRuns.map((r) => (r.id === id ? { ...r, status: 'running' } : r)),
      }));
    }, 1500);
    setTimeout(() => {
      set((s) => ({
        evalRuns: s.evalRuns.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'completed',
                tier1Score: 0.74,
                tier2Score: 0.61,
                pathReachability: 0.7,
                completionRate: 0.95,
              }
            : r,
        ),
      }));
    }, 4500);
    return created;
  },

  createDataset: (input) => {
    const created: MockDataset = {
      id: rand('ds'),
      name: input.name,
      description: input.description,
      injectionIds: [],
      fileCount: 0,
      sizeMb: 0,
      createdAt: nowIso(),
    };
    set((s) => ({ datasets: [created, ...s.datasets] }));
    return created;
  },
  createLabel: (input) => {
    const created: MockLabel = { id: rand('lab'), count: 0, ...input };
    set((s) => ({ labels: [created, ...s.labels] }));
    return created;
  },
  createContainer: (input) => {
    const created: MockContainer = {
      id: rand('cnt'),
      createdAt: nowIso(),
      ...input,
    };
    set((s) => ({ containers: [created, ...s.containers] }));
    return created;
  },
  createProject: (input) => {
    const created: MockProject = {
      id: rand('proj'),
      name: input.name,
      description: input.description,
      status: 'active',
      injectionCount: 0,
      createdAt: nowIso(),
    };
    set((s) => ({ projects: [created, ...s.projects] }));
    return created;
  },

  setTaskStatus: (id, status) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
  },
  setInjectionStatus: (id, status) => {
    set((s) => ({
      injections: s.injections.map((i) => (i.id === id ? { ...i, status } : i)),
    }));
  },
  setPedestalStatus: (id, status) => {
    set((s) => ({ pedestals: s.pedestals.map((p) => (p.id === id ? { ...p, status } : p)) }));
  },

  runPreflight: () => {
    const checks = get().clusterChecks;
    set((s) => ({
      clusterChecks: s.clusterChecks.map((c) => ({ ...c, status: 'checking' })),
    }));
    checks.forEach((c, idx) => {
      setTimeout(() => {
        set((s) => ({
          clusterChecks: s.clusterChecks.map((x) =>
            x.id === c.id ? { ...x, status: c.id === 'chk-otel' || c.id === 'chk-pedestals' ? 'warn' : 'ok' } : x,
          ),
          clusterEvents: [
            {
              ts: new Date().toISOString().slice(11, 19),
              level: 'info' as const,
              body: `${c.name} → re-checked`,
            },
            ...s.clusterEvents,
          ].slice(0, 12),
        }));
      }, 600 + idx * 250);
    });
  },
  setClusterCheckStatus: (id, status, detail) => {
    set((s) => ({
      clusterChecks: s.clusterChecks.map((c) =>
        c.id === id ? { ...c, status, detail: detail ?? c.detail } : c,
      ),
    }));
  },
  appendClusterEvent: (level, body) => {
    set((s) => ({
      clusterEvents: [
        { ts: new Date().toISOString().slice(11, 19), level, body },
        ...s.clusterEvents,
      ].slice(0, 12),
    }));
  },
  setEvalRunStatus: (id, status) => {
    set((s) => ({
      evalRuns: s.evalRuns.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
  },
  setRegressionRunStatus: (id, status) => {
    set((s) => ({
      regressionRuns: s.regressionRuns.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
  },
}));
