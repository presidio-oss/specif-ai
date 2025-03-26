import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { ipcMain, app } from "electron";
import * as semver from 'semver';

const isDEV = false;

export function getAutoUpdater() {
    if (isDEV) {
        autoUpdater.updateConfigPath = path.join(app.getAppPath(), 'dev-app-update.yml');
        autoUpdater.forceDevUpdateConfig = true;
    }

    return autoUpdater;
}

export function setupAppUpdateHandler() {
    ipcMain.handle('app-updater:check-for-updates', async (_event) => {
        console.debug('[app-updater:check-for-updates]: Entered')
        let output = null;

        try {
            const updaterInstance = getAutoUpdater();
            const response = await updaterInstance.checkForUpdates();
            
            if (response && response.updateInfo) {
                const latestVersion = response.updateInfo.version;
                const currentVersion = app.getVersion();

                if (semver.gt(latestVersion, currentVersion)) {
                    output = {
                        currentVersion,
                        ...response.updateInfo
                    };
                } else {
                    console.debug('[app-updater:check-for-updates]: No newer updates available');
                }
            }
        } catch (error: any) {
            console.error('Error handling app-updater:check-for-updates', error.message);
            throw error;
        }

        console.debug('[app-updater:check-for-updates]: Exited')
        return output
    });

    ipcMain.handle('app-updater:download-updates', async (_event, data) => {
        console.debug('[app-updater:download-updates]: Entered')

        try {
            const updaterInstance = getAutoUpdater();

            const response = await updaterInstance.checkForUpdates();
            if (!(response && response.updateInfo)) {
                throw new Error('Somthing went wrong, please try again.')
            }
            
            const latestVersion = response.updateInfo.version;
            const downloadVersion = data.version;

            if (!(latestVersion === downloadVersion)) {
                throw new Error('Version mismatch, please try again.')
            }

            // Download the latest build
            await response.downloadPromise

            // Install and restart the app
            updaterInstance.quitAndInstall();
        } catch (error: any) {
            console.error('Error handling app-updater:download-updates', error.message);
            throw error;
        }
        
        console.debug('[app-updater:download-updates]: Exited')
    });
}
