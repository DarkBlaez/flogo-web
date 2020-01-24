import { getInitializedEngine } from '../modules/engine';
import { syncTasks } from '../modules/contrib-install-controller/sync-tasks';

export async function boostrapEngine(enginePath: string) {
  const engine = await getInitializedEngine(enginePath, {
    forceCreate: !!process.env['FLOGO_WEB_ENGINE_FORCE_CREATION'],
    useEngineConfig: true,
  });
  await engine.build({ syncImports: true });
  await syncTasks(engine);
}
