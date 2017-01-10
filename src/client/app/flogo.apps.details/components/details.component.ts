import { Component, AfterViewInit, OnInit, ViewChild, ElementRef, Renderer } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IFlogoApplicationModel, IFlogoApplicationFlowModel } from '../../../common/application.model';
import { timeString } from '../../../common/utils';
import { RESTAPIApplicationsService } from '../../../common/services/restapi/applications-api.service';
import { TranslateService } from 'ng2-translate/ng2-translate';



@Component({
    selector: 'flogo-app-details',
    moduleId: module.id,
    templateUrl: 'details.tpl.html',
    styleUrls: [ 'details.component.css' ]
})
export class FlogoApplicationDetailsComponent implements AfterViewInit, OnInit  {
    @ViewChild('appInputName') appInputName: ElementRef;
    @ViewChild('appInputDescription') appInputDescription: ElementRef;
    application: IFlogoApplicationModel = null;
    searchPlaceHolder:string = '';
    createdAtFormatted: any;
    updateAtFormatted: any;
    editingDescription: boolean = false;
    editingName: boolean = false;
    flows: Array<IFlogoApplicationFlowModel> = [];


    constructor(
        private route: ActivatedRoute,
        public translate: TranslateService,
        private renderer: Renderer,
        private apiApplications: RESTAPIApplicationsService
    ) { }

  ngOnInit() {

    // get application details by id
    this.apiApplications.get(this.route.snapshot.params['id'])
      .then((application: IFlogoApplicationModel) => {
        console.log('App ID', this.route.snapshot.params['id']);
        console.log('Application', application);
        this.application = application;
        this.flows = this.getOriginalFlows();
      })
      .then(() => {
        this.searchPlaceHolder = this.translate.instant('DETAILS:SEARCH');

        let timeStr = timeString(this.application.createdAt);
        this.createdAtFormatted = moment(timeStr, 'YYYYMMDD hh:mm:ss').fromNow();


        if (this.application.updatedAt == null) {
          this.editingName = true;
          this.updateAtFormatted = null;
        } else {
          this.editingName = false;
          this.updateAtFormatted = moment(timeString(this.application.updatedAt), 'YYYYMMDD hh:mm:ss').fromNow();
        }
      })
      .then(() => {
        if(this.application.updatedAt == null) {
          this.renderer.invokeElementMethod(this.appInputName.nativeElement, 'focus',[]);
        }
      });
  }

    getOriginalFlows() {
        return _.clone(this.application.flows || []);
    }


    ngAfterViewInit() {
        // if(this.application.updatedAt == null) {
        //     this.renderer.invokeElementMethod(this.appInputName.nativeElement, 'focus',[]);
        // }
    }

    onClickAddDescription(event) {
        this.editingDescription = true;
        // wait to refresh view
        setTimeout(()=> {
            this.renderer.invokeElementMethod(this.appInputDescription.nativeElement, 'focus',[]);
        }, 0);
    }

    onInputDescriptionBlur(event) {
        this.editingDescription = false;
    }

    onInputNameChange(event) {
        this.application.updatedAt = new Date();
    }

    onInputNameBlur(event) {
        if(this.application.name) {
            this.editingName = false;
        }
    }

    onClickLabelName(event) {
        this.editingName = true;
        setTimeout(()=> {
            this.renderer.invokeElementMethod(this.appInputName.nativeElement, 'focus',[]);
        },0);
    }

    onClickLabelDescription(event) {
        this.editingDescription = true;
        setTimeout(()=> {
            this.renderer.invokeElementMethod(this.appInputDescription.nativeElement, 'focus',[]);
        },0);
    }

    onKeyUpName(event) {
        if(event.code == "Enter") {
            this.editingName = false;
        }
    }

    onKeyUpDescription(event) {
    }

    onChangedSearch(search) {
        let flows = this.application.flows || [];

        if(search && flows.length){
            let filtered =  flows.filter((flow:IFlogoApplicationFlowModel)=> {
                return (flow.name || '').toLowerCase().includes(search.toLowerCase()) ||
                       (flow.description || '').toLowerCase().includes(search.toLowerCase())
            });

            this.flows = filtered || [];

        }else {
            this.flows = this.getOriginalFlows();
        }
    }
}
