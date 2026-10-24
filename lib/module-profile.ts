// Build setting shared by the browser and server. Only a new deployment can
// activate the retained modules; requests and user preferences cannot do so.
export const fullWorkspace = process.env.NEXT_PUBLIC_ERP_MODULE_PROFILE === 'full';
export const coreModules = ['Executive', 'CRM', 'Finance', 'Settings'] as const;
export const deferredModules = ['EOS', 'Projects', 'Marketing', 'Email', 'OS', 'Documents', 'Office'] as const;
export const enabledModules: readonly string[] = fullWorkspace ? [...coreModules, ...deferredModules] : coreModules;
export function isModuleEnabled(module: string) {
  return enabledModules.includes(module);
}
