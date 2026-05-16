import { create } from 'zustand';

import type { GuidedInjectionSpec } from '../mocks/types';

export interface StagedInjection {
  id: string;
  spec: GuidedInjectionSpec;
  addedAt: string;
}

export interface InjectionTemplate {
  id: string;
  name: string;
  description: string;
  spec: GuidedInjectionSpec;
}

interface BatchState {
  staged: StagedInjection[];
  templates: InjectionTemplate[];
  stage: (spec: GuidedInjectionSpec) => void;
  remove: (index: number) => void;
  clear: () => void;
  saveTemplate: (
    name: string,
    description: string,
    spec: GuidedInjectionSpec
  ) => InjectionTemplate;
}

let counter = 0;
function rand(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export const useInjectBatch = create<BatchState>((set) => ({
  staged: [],
  templates: [],
  stage: (spec) => {
    set((s) => ({
      staged: [
        ...s.staged,
        { id: rand('staged'), spec, addedAt: new Date().toISOString() },
      ],
    }));
  },
  remove: (index) => {
    set((s) => ({ staged: s.staged.filter((_, i) => i !== index) }));
  },
  clear: () => {
    set(() => ({ staged: [] }));
  },
  saveTemplate: (name, description, spec) => {
    const tpl: InjectionTemplate = { id: rand('tpl'), name, description, spec };
    set((s) => ({ templates: [tpl, ...s.templates] }));
    return tpl;
  },
}));
