<?php

namespace App\Enums;

enum ActivityAction: string
{
    case LOGIN = 'LOGIN';
    case LOGOUT = 'LOGOUT';
    case SCAN_IN = 'SCAN_IN';
    case SCAN_OUT = 'SCAN_OUT';
    case APPROVE_LEAVE = 'APPROVE_LEAVE';
    case REJECT_LEAVE = 'REJECT_LEAVE';
    case CREATE_EMPLOYEE = 'CREATE_EMPLOYEE';
    case UPDATE_EMPLOYEE = 'UPDATE_EMPLOYEE';
    case DELETE_EMPLOYEE = 'DELETE_EMPLOYEE';
    case GENERATE_QR = 'GENERATE_QR';
    case TOGGLE_QR = 'TOGGLE_QR';
    case UPDATE_SETTINGS = 'UPDATE_SETTINGS';
    case IMPERSONATE = 'IMPERSONATE';
    case STOP_IMPERSONATE = 'STOP_IMPERSONATE';
}
