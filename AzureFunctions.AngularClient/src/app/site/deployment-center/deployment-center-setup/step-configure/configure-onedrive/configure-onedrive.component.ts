import { Component } from '@angular/core';
import { DeploymentCenterStateManager } from 'app/site/deployment-center/deployment-center-setup/wizard-logic/deployment-center-state-manager';
import { PortalService } from 'app/shared/services/portal.service';
import { CacheService } from 'app/shared/services/cache.service';
import { ArmService } from 'app/shared/services/arm.service';
import { DropDownElement } from 'app/shared/models/drop-down-element';
import { Constants, LogCategories, DeploymentCenterConstants } from 'app/shared/models/constants';
import { Subject } from 'rxjs/Subject';
import { OnDestroy } from '@angular/core/src/metadata/lifecycle_hooks';
import { LogService } from 'app/shared/services/log.service';

@Component({
    selector: 'app-configure-onedrive',
    templateUrl: './configure-onedrive.component.html',
    styleUrls: ['./configure-onedrive.component.scss', '../step-configure.component.scss']
})
export class ConfigureOnedriveComponent implements OnDestroy {
    private _resourceId: string;
    public folderList: DropDownElement<string>[];
    private _ngUnsubscribe = new Subject();
    private _onedriveCallSubject = new Subject();

    constructor(
        public wizard: DeploymentCenterStateManager,
        _portalService: PortalService,
        private _cacheService: CacheService,
        _armService: ArmService,
        private _logService: LogService
    ) {
        this.wizard.wizardForm.controls.sourceSettings.value.isManualIntegration = false;
        this.wizard.resourceIdStream.takeUntil(this._ngUnsubscribe).subscribe(r => {
            this._resourceId = r;
        });
        this._onedriveCallSubject
            .takeUntil(this._ngUnsubscribe)
            .switchMap(() =>
                this._cacheService.post(Constants.serviceHost + 'api/onedrive/passthrough', true, null, {
                    url: `${DeploymentCenterConstants.onedriveApiUri}/children`
                })
            )
            .subscribe(
                r => {
                    const rawFolders = r.json();
                    let options: DropDownElement<string>[] = [];
                    const splitRID = this._resourceId.split('/');
                    const siteName = splitRID[splitRID.length - 1];

                    options.push({
                        displayLabel: siteName,
                        value: `${DeploymentCenterConstants.onedriveApiUri}/${siteName}`
                    });

                    rawFolders.value.forEach(item => {
                        if (siteName.toLowerCase() === item.name.toLowerCase()) {
                        } else {
                            options.push({
                                displayLabel: item.name,
                                value: `${DeploymentCenterConstants.onedriveApiUri}/${item.name}`
                            });
                        }
                    });

                    this.folderList = options;
                    this.wizard.wizardForm.controls.sourceSettings.value.repoUrl = `${DeploymentCenterConstants.onedriveApiUri}/${siteName}`;
                },
                err => {
                    this._logService.error(LogCategories.cicd, '/fetch-onedrive-folders', err);
                }
            );
        this.fillOnedriveFolders();
    }

    public fillOnedriveFolders() {
        this.folderList = [];
        this._onedriveCallSubject.next();
    }

    ngOnDestroy(): void {
        this._ngUnsubscribe.next();
    }
}
