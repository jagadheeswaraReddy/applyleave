import { Component, OnInit, OnDestroy }       from '@angular/core';
import {ActivatedRoute, Params} from "@angular/router";

import {QuestionService, HolidayService, YearlyEntitlementService, LeaveTransactionService, EmployeeService, TitleService, AlertService} from '../_services/index';
import {YearlyEntitlement, LeaveTransaction, LeaveFlowDecisionTaken, LeaveRuleBean} from "../_models/index";
import {FormGroup} from "@angular/forms";

import {checkDateRange} from '../shared/validators';
import * as moment from "moment";
import {Message} from "primeng/components/common/api";
import {Employee} from "../_models/employee";
import "rxjs/add/operator/takeWhile";

@Component({
    moduleId: module.id,
    selector: 'apply-leave',
    templateUrl: 'apply-leave.component.html',
    styleUrls: ['/app/_templates/dynamic-forms/df-question.component.css'],
    providers:  [QuestionService]
})
export class ApplyLeaveComponent implements OnInit, OnDestroy {

    waiting: boolean;

    private sub: any;

    private currentUser: any;

    leaveType: any;
    initStartDate: Date;

    leaveTypeOptions: any[];
    yeIds: any[];
    curLeaveBal: YearlyEntitlement;
    questions: any[];
    msgs: Message[] = [];

    annualId: any = -1;
    inlieuId: any = -1;

    leaveSelectFocus = false;

    numberOfDays = 0;

    payload: '';

    dates: any[] = ['', ''];

    private alive: boolean = true;
    ngOnDestroy(){
        this.alive = false;
    }





    constructor(
        private holidayService: HolidayService,
        private yeService: YearlyEntitlementService,
        private leaveTransactionService: LeaveTransactionService,
        private empService: EmployeeService,
        private questionService: QuestionService,
        private route: ActivatedRoute,
        private titleService: TitleService,
        private alertService: AlertService
    ) {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.leaveTypeOptions = [];
        this.yeIds = [];
        this.titleService.setTitle('Leave Application');
        this.titleService.setMobileTitle('Leave Application');
    }

    ngOnInit(){
        this.waiting = true;
        this.sub = this.route.params.takeWhile(()=>this.alive).subscribe(params => {
            if(+params['leaveType']){
                this.leaveType = +params['leaveType'];
            }else{
                this.leaveType = -1;
            }
            if(params['startDate'] && moment(params['startDate'], 'YYYY-MM-DD').isValid()){
                this.initStartDate = moment(params['startDate'], 'YYYY-MM-DD').toDate();
                this.initStartDate.setHours(9,0,0,0);
            }else{
                this.initStartDate = null;
            }
        });
        this.getLeaveTypes();

    }
    getLeaveTypes(){
        this.yeService.getByUserId(this.currentUser['id']).takeWhile(()=>this.alive).subscribe(
            data => {
                this.leaveTypeOptions = [{label: '',  value: -1}];
                this.yeIds = [];
                if(data){
                    for(let d of data){
                        this.yeIds[d.leaveType.id] = d.id;
                        if(d.entitlement === 0 || d.yearlyLeaveBalance >= 0){
                            this.leaveTypeOptions.push({
                                label: d.leaveType.name,
                                value: d.leaveType.id,
                            });
                            if(d.leaveType.name === 'Time-In-Lieu') {
                                this.inlieuId = d.leaveType.id;
                            }
                            if(d.leaveType.name === 'Annual'){
                                this.annualId = d.leaveType.id;
                                //Add emergency leave
                                d.leaveType.name = 'Emergency';
                                d.leaveType.description = 'Emergency leave';
                                this.leaveTypeOptions.push({
                                    label: d.leaveType.name,
                                    value: 999,
                                });
                            }
                        }
                    }
                    this.onChange();
                }else{
                    this.msgs = [];
                    this.msgs.push({severity: 'error', summary: 'Leave Type Error', detail: 'Unable to retrieve yearly entitlements'});
                    this.waiting = false;
                }
            },
            error => {
                this.msgs = [];
                this.msgs.push({severity: 'error', summary: 'Leave Type Error', detail: error || 'Server error'});
                this.waiting = false;
            }
        )
    }

    get allowed(): boolean {
        if (this.curLeaveBal) {
            return this.curLeaveBal.yearlyLeaveBalance > 0 || this.curLeaveBal.entitlement === 0;
        }
        return true;
    }

    onChange(){
        if(this.leaveType > 0) {
            this.waiting = true;
            var lt = this.leaveType;
            if(this.leaveType == 999 || this.leaveType == this.inlieuId) {
                lt = this.annualId;
            }
            this.yeService.getById(this.yeIds[lt]).takeWhile(()=>this.alive).subscribe(
                (data: YearlyEntitlement) => {
                    this.curLeaveBal = data;
                    if(this.leaveType == 999){
                        this.curLeaveBal.leaveType.name = 'Emergency';
                        this.curLeaveBal.leaveType.description = 'Emergency leave';
                    }else if(this.leaveType == this.inlieuId){
                        this.curLeaveBal.id = this.yeIds[this.inlieuId];
                        this.curLeaveBal.leaveType.id = this.inlieuId;
                        this.curLeaveBal.leaveType.name = 'Time-In-Lieu';
                        this.curLeaveBal.leaveType.description = 'Time-off in-lieu';
                    }
                    this.questions = this.questionService.getLeaveQuestions(this.curLeaveBal.leaveType, this.initStartDate);
                    this.initStartDate = null;
                    this.waiting = false;
                },
                error => {
                    this.msgs = [];
                    this.msgs.push({severity: 'error', summary: 'Leave Type Error', detail: error || 'Server error'});
                    this.waiting = false;
                }
            );
        }else{
            this.waiting = false;
        }
    }

    updateNumberOfDays(value){
        if((moment(value['start']).isValid() && moment(value['end']).isValid()) && (this.dates[0] != value['start'] || this.dates[1] != value['end'])) {
            this.dates[0] = value['start'];
            this.dates[1] = value['end'];
            this.holidayService.numberOfDays(value['start'], value['end']).takeWhile(()=>this.alive).subscribe(
                data => {
                    this.numberOfDays = data;
                }
            );
        }
    }

    submit(event) {
        //TODO: Get all required fields for a leave transaction.
        //alert(event.value);

        this.waiting = true;
        var value: any = JSON.parse(event.value);
        console.log(value);
        var filename = '';
        var file = [];
        if(value['sickLeaveAttachment']){
            filename =  value['sickLeaveAttachment']['name'];
            file = value['sickLeaveAttachment']['value'];
        }
        this.empService.getByUserId(JSON.parse(localStorage.getItem('currentUser')).id).takeWhile(()=>this.alive).subscribe(
            (employee: Employee) => {
                this.leaveTransactionService.create(new LeaveTransaction(0, false, JSON.parse(localStorage['currentUser']).username, new Date(), null, null,
                    new Date(),
                    new Date(value['start']),
                    new Date(value['end']),
                    this.curLeaveBal.yearlyLeaveBalance,
                    this.numberOfDays,
                    value['reason'],
                    this.curLeaveBal.leaveType.id,
                    employee.id,
                    1,
                    'Pending',
                    '',
                    '',
                    filename,
                    '',
                    new LeaveRuleBean(0, this.leaveType.toString(),'','','','','','',false),
                    new LeaveFlowDecisionTaken(0,'','','','','','','','','','',false),
                    file,
                    '',
                    this.currentUser['roleList'],
                    this.curLeaveBal.leaveType.name,
                    this.currentUser['username'],
                    this.currentUser['id'],
                    this.curLeaveBal.id,
                    null,
                    null,
                    employee.name,
                    employee.workEmailAddress)
                ).takeWhile(()=>this.alive).subscribe(success=> {
                    this.msgs = [];
                    this.msgs.push({severity: 'success', summary: 'Leave has been applied'});
                    this.waiting = false;
                }, error=> {
                    this.msgs = [];
                    this.msgs.push({severity: 'error', summary: 'Leave Application Error', detail: error || 'Server Error'});
                    this.waiting = false;
                });

            },
            error => {
                this.msgs = [];
                this.msgs.push({severity: 'error', summary: 'Employee Error', detail: error || 'Server error'});
                this.waiting = false;
            }
        )

    }

    checkDateRange = checkDateRange;
}