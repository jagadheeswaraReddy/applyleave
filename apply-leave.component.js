"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
var router_1 = require("@angular/router");
var index_1 = require('../_services/index');
var index_2 = require("../_models/index");
var validators_1 = require('../shared/validators');
var moment = require("moment");
require("rxjs/add/operator/takeWhile");
var ApplyLeaveComponent = (function () {
    function ApplyLeaveComponent(holidayService, yeService, leaveTransactionService, empService, questionService, route, titleService, alertService) {
        this.holidayService = holidayService;
        this.yeService = yeService;
        this.leaveTransactionService = leaveTransactionService;
        this.empService = empService;
        this.questionService = questionService;
        this.route = route;
        this.titleService = titleService;
        this.alertService = alertService;
        this.msgs = [];
        this.annualId = -1;
        this.inlieuId = -1;
        this.leaveSelectFocus = false;
        this.numberOfDays = 0;
        this.dates = ['', ''];
        this.alive = true;
        this.checkDateRange = validators_1.checkDateRange;
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.leaveTypeOptions = [];
        this.yeIds = [];
        this.titleService.setTitle('Leave Application');
        this.titleService.setMobileTitle('Leave Application');
    }
    ApplyLeaveComponent.prototype.ngOnDestroy = function () {
        this.alive = false;
    };
    ApplyLeaveComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.waiting = true;
        this.sub = this.route.params.takeWhile(function () { return _this.alive; }).subscribe(function (params) {
            if (+params['leaveType']) {
                _this.leaveType = +params['leaveType'];
            }
            else {
                _this.leaveType = -1;
            }
            if (params['startDate'] && moment(params['startDate'], 'YYYY-MM-DD').isValid()) {
                _this.initStartDate = moment(params['startDate'], 'YYYY-MM-DD').toDate();
                _this.initStartDate.setHours(9, 0, 0, 0);
            }
            else {
                _this.initStartDate = null;
            }
        });
        this.getLeaveTypes();
    };
    ApplyLeaveComponent.prototype.getLeaveTypes = function () {
        var _this = this;
        this.yeService.getByUserId(this.currentUser['id']).takeWhile(function () { return _this.alive; }).subscribe(function (data) {
            _this.leaveTypeOptions = [{ label: '', value: -1 }];
            _this.yeIds = [];
            if (data) {
                for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                    var d = data_1[_i];
                    _this.yeIds[d.leaveType.id] = d.id;
                    if (d.entitlement === 0 || d.yearlyLeaveBalance >= 0) {
                        _this.leaveTypeOptions.push({
                            label: d.leaveType.name,
                            value: d.leaveType.id,
                        });
                        if (d.leaveType.name === 'Time-In-Lieu') {
                            _this.inlieuId = d.leaveType.id;
                        }
                        if (d.leaveType.name === 'Annual') {
                            _this.annualId = d.leaveType.id;
                            //Add emergency leave
                            d.leaveType.name = 'Emergency';
                            d.leaveType.description = 'Emergency leave';
                            _this.leaveTypeOptions.push({
                                label: d.leaveType.name,
                                value: 999,
                            });
                        }
                    }
                }
                _this.onChange();
            }
            else {
                _this.msgs = [];
                _this.msgs.push({ severity: 'error', summary: 'Leave Type Error', detail: 'Unable to retrieve yearly entitlements' });
                _this.waiting = false;
            }
        }, function (error) {
            _this.msgs = [];
            _this.msgs.push({ severity: 'error', summary: 'Leave Type Error', detail: error || 'Server error' });
            _this.waiting = false;
        });
    };
    Object.defineProperty(ApplyLeaveComponent.prototype, "allowed", {
        get: function () {
            if (this.curLeaveBal) {
                return this.curLeaveBal.yearlyLeaveBalance > 0 || this.curLeaveBal.entitlement === 0;
            }
            return true;
        },
        enumerable: true,
        configurable: true
    });
    ApplyLeaveComponent.prototype.onChange = function () {
        var _this = this;
        if (this.leaveType > 0) {
            this.waiting = true;
            var lt = this.leaveType;
            if (this.leaveType == 999 || this.leaveType == this.inlieuId) {
                lt = this.annualId;
            }
            this.yeService.getById(this.yeIds[lt]).takeWhile(function () { return _this.alive; }).subscribe(function (data) {
                _this.curLeaveBal = data;
                if (_this.leaveType == 999) {
                    _this.curLeaveBal.leaveType.name = 'Emergency';
                    _this.curLeaveBal.leaveType.description = 'Emergency leave';
                }
                else if (_this.leaveType == _this.inlieuId) {
                    _this.curLeaveBal.id = _this.yeIds[_this.inlieuId];
                    _this.curLeaveBal.leaveType.id = _this.inlieuId;
                    _this.curLeaveBal.leaveType.name = 'Time-In-Lieu';
                    _this.curLeaveBal.leaveType.description = 'Time-off in-lieu';
                }
                _this.questions = _this.questionService.getLeaveQuestions(_this.curLeaveBal.leaveType, _this.initStartDate);
                _this.initStartDate = null;
                _this.waiting = false;
            }, function (error) {
                _this.msgs = [];
                _this.msgs.push({ severity: 'error', summary: 'Leave Type Error', detail: error || 'Server error' });
                _this.waiting = false;
            });
        }
        else {
            this.waiting = false;
        }
    };
    ApplyLeaveComponent.prototype.updateNumberOfDays = function (value) {
        var _this = this;
        if ((moment(value['start']).isValid() && moment(value['end']).isValid()) && (this.dates[0] != value['start'] || this.dates[1] != value['end'])) {
            this.dates[0] = value['start'];
            this.dates[1] = value['end'];
            this.holidayService.numberOfDays(value['start'], value['end']).takeWhile(function () { return _this.alive; }).subscribe(function (data) {
                _this.numberOfDays = data;
            });
        }
    };
    ApplyLeaveComponent.prototype.submit = function (event) {
        //TODO: Get all required fields for a leave transaction.
        //alert(event.value);
        var _this = this;
        this.waiting = true;
        var value = JSON.parse(event.value);
        console.log(value);
        var filename = '';
        var file = [];
        if (value['sickLeaveAttachment']) {
            filename = value['sickLeaveAttachment']['name'];
            file = value['sickLeaveAttachment']['value'];
        }
        this.empService.getByUserId(JSON.parse(localStorage.getItem('currentUser')).id).takeWhile(function () { return _this.alive; }).subscribe(function (employee) {
            _this.leaveTransactionService.create(new index_2.LeaveTransaction(0, false, JSON.parse(localStorage['currentUser']).username, new Date(), null, null, new Date(), new Date(value['start']), new Date(value['end']), _this.curLeaveBal.yearlyLeaveBalance, _this.numberOfDays, value['reason'], _this.curLeaveBal.leaveType.id, employee.id, 1, 'Pending', '', '', filename, '', new index_2.LeaveRuleBean(0, _this.leaveType.toString(), '', '', '', '', '', '', false), new index_2.LeaveFlowDecisionTaken(0, '', '', '', '', '', '', '', '', '', '', false), file, '', _this.currentUser['roleList'], _this.curLeaveBal.leaveType.name, _this.currentUser['username'], _this.currentUser['id'], _this.curLeaveBal.id, null, null, employee.name, employee.workEmailAddress)).takeWhile(function () { return _this.alive; }).subscribe(function (success) {
                _this.msgs = [];
                _this.msgs.push({ severity: 'success', summary: 'Leave has been applied' });
                _this.waiting = false;
            }, function (error) {
                _this.msgs = [];
                _this.msgs.push({ severity: 'error', summary: 'Leave Application Error', detail: error || 'Server Error' });
                _this.waiting = false;
            });
        }, function (error) {
            _this.msgs = [];
            _this.msgs.push({ severity: 'error', summary: 'Employee Error', detail: error || 'Server error' });
            _this.waiting = false;
        });
    };
    ApplyLeaveComponent = __decorate([
        core_1.Component({
            moduleId: module.id,
            selector: 'apply-leave',
            templateUrl: 'apply-leave.component.html',
            styleUrls: ['/app/_templates/dynamic-forms/df-question.component.css'],
            providers: [index_1.QuestionService]
        }), 
        __metadata('design:paramtypes', [index_1.HolidayService, index_1.YearlyEntitlementService, index_1.LeaveTransactionService, index_1.EmployeeService, index_1.QuestionService, router_1.ActivatedRoute, index_1.TitleService, index_1.AlertService])
    ], ApplyLeaveComponent);
    return ApplyLeaveComponent;
}());
exports.ApplyLeaveComponent = ApplyLeaveComponent;
//# sourceMappingURL=apply-leave.component.js.map