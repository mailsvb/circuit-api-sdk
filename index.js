const util          = require('util');
const EventEmitter  = require('events').EventEmitter;
const NodeWebSocket = require('ws');
const https         = require('https');
const fs            = require('fs');
const url           = require('url');
const querystring   = require('querystring');
const uuid          = require('uuid/v1');
const async         = require('async');
const Entities      = require('html-entities').AllHtmlEntities;
const entities      = new Entities();
const user_agent    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.0000.00';

const getDate = function(date) {
    var now = date || (new Date());
    var MM = (now.getMonth() + 1);
        if (MM < 10) { MM = '0' + MM; }
    var DD = now.getDate();
        if (DD < 10) { DD = '0' + DD; }
    var H = now.getHours();
        if (H < 10) { H = '0' + H; }
    var M = now.getMinutes();
        if (M < 10) { M = '0' + M; }
    var S = now.getSeconds();
        if (S < 10) { S = '0' + S; }
    return DD + "." + MM + "." + now.getFullYear() + " - " + H + ":" + M + ":" + S;
};

const getLogonMsg = function(_self) {
    let r = '{"msgType":"REQUEST","request":{"requestId":' + _self.nextReqID() + ',"type":"USER","user":{"type":"LOGON","logon":{"clientDisplayname":"TEST","info":{"deviceType":["WEB"],"manufacturer":"Unify","osVersion":"Win10"}}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + util.inspect(JSON.parse(r), { showHidden: true, depth: null, breakLength: 'Infinity' }));
    return r;
};
const getStartupMsg = function(_self) {
    let r = '{"msgType":"REQUEST","request":{"requestId":' + _self.nextReqID() + ',"type":"VERSION","version":{"type":"GET_VERSION"}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + util.inspect(JSON.parse(r), { showHidden: true, depth: null, breakLength: 'Infinity' }));
    return r;
};
const getDoStuffMsg = function(_self) {
    let r = '{"msgType":"REQUEST","request":{"requestId":' + _self.nextReqID() + ',"type":"USER","user":{"type":"GET_STUFF","getStuff":{"types":["USER","ACCOUNTS","PRESENCE_STATE"]}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + util.inspect(JSON.parse(r), { showHidden: true, depth: null, breakLength: 'Infinity' }));
    return r;
};
const getAddTextMsg = function(_self, resolve, reject, convId, parentId, subject, content, attachment) {
    (attachment == '') ? attachment = '[]' : attachment = attachment;
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"ADD_TEXT_ITEM","addTextItem":{"convId":"' + convId + '","contentType":"RICH","subject":"' + subject + '","content":"' + content + '","attachmentMetaData":' + attachment + ',"externalAttachmentMetaData":[],"preview":null,"mentionedUsers":[]' + ((parentId) ? (',"parentId":"' + parentId + '"') : '' ) + '}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getAddParticipantsMsg = function(_self, resolve, reject, convId, participants) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"ADD_PARTICIPANT","addParticipant":{"convId":"' + convId + '","locale":"EN_US","userId":' + participants + '}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getAddRTCParticipantsMsg = function(_self, resolve, reject, RTCsession, participants) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"RTC_SESSION","rtcSession":{"type":"ADD_PARTICIPANT","addParticipant":{"rtcSessionId":"' + RTCsession + '","userId":"' + participants + '","mediaType":["AUDIO","VIDEO"]}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getGetConversationsMsg = function(_self, resolve, reject, date, direction, number) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"GET_CONVERSATIONS","getConversations":{"userId":"' + _self.userId + '","modificationDate":' + date + ',"direction":"' + direction + '","number":' + number + ',"filter":"ALL"}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getGetUsersByMailMsg = function(_self, resolve, reject, mail) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"USER","user":{"type":"GET_USERS_BY_MAILS","getUsersByMails":{"emailAddresses":' + mail + ',"excludeRoles":["SUPPORT"]}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getCreateGroupConvMsg = function(_self, resolve, reject, participants, topic) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"CREATE","create":{"type":"GROUP","topic":"' + topic + '","participants":' + participants + '}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getModeratorConvMsg = function(_self, resolve, reject, convId) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"MODERATE_CONVERSATION","moderateConversation":{"convId":"' + convId + '"}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getGuestAccessDisabledMsg = function(_self, resolve, reject, convId, disabled) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"UPDATE_GUEST_ACCESS","updateGuestAccess":{"convId":"' + convId + '","guestAccessDisabled":' + disabled + '}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getGrantModeratorConvMsg = function(_self, resolve, reject, convId, userIds) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"GRANT_MODERATOR_RIGHTS","grantModeratorRights":{"convId":"' + convId + '","userId":' + userIds + '}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};
const getGetActivitiesMsg = function(_self, resolve, reject, number) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"ACTIVITYSTREAM","activityStream":{"type":"GET_ACTIVITIES_BY_USER","getActivitiesByUser":{"timestamp":null,"numberOfItems":' + number + '}}}}';
    _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + r);
    return r;
};

const doHttpPost = function(options, data, cb) {
    let req = https.request(options, (res) => {
        let data = '';
        res.on('data', (d) => data += d);
        res.on('end', () => cb(res.headers, data, null));
    });
    req.on('error', (e) => {
        cb(null, null, e);
    });
    req.setTimeout(15000, () => cb(null, null, 'request timeout'));
    req.write(data);
    req.end();
};

let Circuit = function(data) {
    const _self         = this;
    this.connected      = false;
    this.loginattempts  = 0;
    this.reqID          = 0;
    this.server         = data.server;
    if (data.username && data.password) {
        this.credentials = querystring.stringify({
                                'username' : data.username,
                                'password' : data.password
                              });
    }
    if (data.client_id && data.client_secret) {
        this.basicauth = new Buffer(data.client_id + ":" + data.client_secret).toString('base64');
    }
    this.cookie         = null;
    this.ws             = null;
    this.resolver       = {};
    this.rejecter       = {};
    
    this.nextReqID = function() {
        this.reqID += 1;
        return this.reqID;
    };
    
    this.getCookie = () => {
        _self.loginattempts += 1;
        if (_self.loginattempts > 3) { return _self.rejecter['login']('too many login attempts. aborting'); }
        let options = {
            hostname: this.server,
            port: 443,
            path: '/mobilelogin',
            method: 'POST',
            rejectUnauthorized: false,
            headers: {
                'User-Agent': user_agent,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        let postData = '';
        
        if (_self.credentials) {
            options.headers['Content-Length'] = _self.credentials.length;
            postData = _self.credentials;
        }
        if (_self.basicauth) {
            options.path = '/oauth/token';
            options.headers['Authorization'] = 'Basic ' + _self.basicauth;
            postData = 'grant_type=client_credentials&scope=ALL';
        }
        
        doHttpPost(options, postData, (headers, data, error) => {
            if (error) {
                return _self.rejecter['login'](error);
            }
            if (headers['set-cookie']) {
                let cookieHeader = headers['set-cookie'].toString();
                let regEx = /.*(connect\.sess=.*?);.*/i;
                let found = cookieHeader.match(regEx);
                if (found instanceof Array && found.length > 0) {
                    _self.cookie = found[1];
                    _self.getWS();
                } else {
                    return _self.rejecter['login'](headers);
                }
            }
            else {
                try {
                    data = JSON.parse(data.toString());
                    if (data instanceof Object && data.access_token) {
                        options.path = '/sdklogin';
                        options.headers['Authorization'] = 'Bearer ' + data.access_token;
                        postData = 'accessToken=' + data.access_token + '&persistent=false';
                        doHttpPost(options, postData, (headers, data, error) => {
                            if (error) {
                                return _self.rejecter['login'](error);
                            }
                            let cookieHeader = headers['set-cookie'].toString();
                            let regEx = /.*(connect\.sess=.*?);.*/i;
                            let found = cookieHeader.match(regEx);
                            if (found instanceof Array && found.length > 0) {
                                _self.cookie = found[1];
                                _self.getWS();
                            } else {
                                return _self.rejecter['login'](headers);
                            }
                        });
                    }
                    else {
                        return _self.rejecter['login'](data);
                    }
                }
                catch(e) {
                    return _self.rejecter['login'](error);
                }
            }
        });
    };
    
    this.getWS = () => {
        _self.emit('log', 'trying to connect to API');
        let wsOptions = {headers: {Cookie: _self.cookie,'User-Agent': user_agent}, rejectUnauthorized: false};
        _self.ws = new NodeWebSocket('wss://' + _self.server + '/api', wsOptions);
        _self.ws.on('open', () => _self.wsopen());
        _self.ws.on('message', (data, flags) => _self.wsmessage(data, flags));
        _self.ws.on('error', (error) => _self.wserror(error));
        _self.ws.on('ping', (data, flags) => _self.wsping(data, flags));
        _self.ws.on('pong', (data, flags) => _self.wspong(data, flags));
        _self.ws.on('close', (code, msg) => _self.wsclose(code, msg));
    };
};
util.inherits(Circuit, EventEmitter);

Circuit.prototype.wsopen = function() {
    const _self = this;
    _self.connected = true;
    _self.emit('log', 'API connection established.');
    _self.loginattempts = 0;
    //_self.ws.send(getLogonMsg(_self));
    _self.ws.send(getStartupMsg(_self));
    _self.ws.send(getDoStuffMsg(_self));
    _self.pingInterval = setInterval(() => {
        _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\nPING');
        if (_self.connected) {
            _self.ws.send('PING');
        }
    }, 180000);
};

Circuit.prototype.wsmessage = function(data, flags) {
    const _self = this;
    try {
        _self.emit('log', '<<<<< ' + getDate() + ' <<<<<\n' + data.toString());
        data = JSON.parse(data.toString());
        if (data.msgType == 'RESPONSE' && data.response.type == 'VERSION') {
            _self.emit('log', 'Backend API version: ' + data.response.version.getVersion.version);
        }
        if (data.msgType == 'RESPONSE' && data.response.type == 'USER' && data.response.user.type == 'GET_STUFF') {
            if (data.response.user.getStuff.user) {
                _self.clientId = data.clientId;
                _self.userId = data.response.user.getStuff.user.userId;
                _self.displayName = data.response.user.getStuff.user.displayName;
            }
            _self.emit('log', 'Logged in as: ' + data.response.user.getStuff.user.displayName);
            return _self.resolver['login']();
        }
        if (data.msgType == 'RESPONSE' && _self.resolver.hasOwnProperty(data.response.requestId) && _self.rejecter.hasOwnProperty(data.response.requestId)) {
            let resolve = _self.resolver[data.response.requestId];
            let reject  = _self.rejecter[data.response.requestId];
            delete _self.resolver[data.response.requestId];
            delete _self.rejecter[data.response.requestId];
            if (data.response.code == 'OK') {
                switch (data.response.type) {
                    case 'CONVERSATION':
                        switch (data.response.conversation.type) {
                            case 'ADD_TEXT_ITEM':
                                return resolve(data.response.conversation.addTextItem);
                                break;
                            case 'ADD_PARTICIPANT':
                                return resolve(data.response.conversation.addParticipant);
                                break;
                            case 'GET_CONVERSATIONS':
                                return resolve(data.response.conversation.getConversations);
                                break;
                            case 'CREATE':
                                return resolve(data.response.conversation.create.conversation);
                                break;
                            case 'MODERATE_CONVERSATION':
                                return resolve(data.response.conversation.moderateResult);
                                break;
                            case 'GRANT_MODERATOR_RIGHTS':
                                return resolve(data.response.conversation.grantModeratorRightsResult);
                                break;
                            case 'UPDATE_GUEST_ACCESS':
                                return resolve(data.response.conversation.updateGuestAccessResult);
                                break;
                            default:
                                return resolve(data.response.conversation);
                        }
                        break;
                        
                    case 'USER':
                        switch (data.response.user.type) {
                            case 'GET_USERS_BY_MAILS':
                                return resolve(data.response.user.getUsersByMails.users);
                                break;
                            default:
                                return resolve(data.response.user);
                        }
                        break;
                    
                    case 'ACTIVITYSTREAM':
                        switch (data.response.activityStream.type) {
                            case 'GET_ACTIVITIES_BY_USER':
                                return resolve(data.response.activityStream.getActivitiesByUserResult);
                                break;
                            default:
                                return resolve(data.response.activityStream);
                        }
                    
                    default:
                        return resolve(data.response);
                }
            }
            else {
                return reject(data.response);
            }
        }
        if (data.msgType == 'EVENT') {
            if (data.event.type == 'USER') {
                if (data.event.user.type == 'USER_PRESENCE_CHANGE') {
                    _self.emit('presence', data.event.user.presenceChanged);
                }
            }
            if (data.event.type == 'CONVERSATION') {
                if (data.event.conversation.type == 'ADD_ITEM') {
                    _self.emit('itemAdded', data.event.conversation.addItem);
                }
                if (data.event.conversation.type == 'UPDATE_ITEM') {
                    _self.emit('itemUpdated', data.event.conversation.updateItem);
                }
            }
            if (data.event.type == 'ACTIVITYSTREAM') {
                if (data.event.activity.type == 'ACTIVITY_CREATED') {
                    _self.emit('activityStream', data.event.activity.create.item);
                }
            }
        }
    }
    catch(e) {
        _self.emit('error', e);
    }
};

Circuit.prototype.wserror = function(error) {
    const _self = this;
    if (error.message.match(/401/)) {
        _self.cookie = '';
    }
    _self.emit('error', error.message);
};

Circuit.prototype.wsping = function(data, flags) {
    const _self = this;
    _self.emit('log', 'websocket ping: ' + data);
};

Circuit.prototype.wspong = function(data, flags) {
    const _self = this;
    _self.emit('log', 'websocket pong: ' + data);
};

Circuit.prototype.wsclose = function(code, msg) {
    const _self = this;
    _self.emit('error', '(' + code + ') "' + msg + '"');
    clearInterval(_self.pingInterval);
    if (_self.cookie == '') {
        _self.getCookie();
    } else {
        _self.getWS();
    }
};

Circuit.prototype.encode = function(msg) {
    return entities.encodeNonUTF(msg);
};

Circuit.prototype.login = function() {
    const _self = this;
    _self.emit('log', 'trying to login with given credentials at: ' + _self.server);
    return new Promise((resolve, reject) => {
        _self.resolver['login'] = resolve;
        _self.rejecter['login'] = reject;
        _self.getCookie();
    });
};

Circuit.prototype.getConversations = function(data = {}) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.ws.send(getGetConversationsMsg(_self, resolve, reject, 
                                                ((data.date) ? data.date : new Date().getTime()),
                                                ((data.direction) ? data.direction : 'BEFORE'),
                                                ((data.number) ? data.number : '25'))
                                            );
    });
};

Circuit.prototype.moderation = function(convId) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.ws.send(getModeratorConvMsg(_self, resolve, reject, convId));
    });
};

Circuit.prototype.setModerators = function(convId, userIds) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.ws.send(getGrantModeratorConvMsg(_self, resolve, reject, convId, JSON.stringify(userIds)));
    });
};

Circuit.prototype.createGroupConv = function(participants, topic) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (typeof participants === 'undefined' || !participants instanceof Array || participants.length <= 0) {
            return reject(util.inspect(participants, { showHidden: true, depth: null, breakLength: 'Infinity' }) + ' is not a valid array of user IDs');
        }
        if (typeof topic === 'undefined' || !topic instanceof String) {
            topic = '';
        }
        let userIds = [];
        participants.forEach(id => {
            userIds.push({userId:id});
        });
        userIds.push({userId:_self.userId});
        _self.ws.send(getCreateGroupConvMsg(_self, resolve, reject, JSON.stringify(userIds), topic));
    });
};

Circuit.prototype.getUsersByMail = function(mail) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (typeof mail === 'undefined' || !mail instanceof Array || mail.length <= 0) {
            return reject(util.inspect(mail, { showHidden: true, depth: null, breakLength: 'Infinity' }) + ' is not a valid array of mail addresses');
        }
        _self.ws.send(getGetUsersByMailMsg(_self, resolve, reject, JSON.stringify(mail)));
    });
};

Circuit.prototype.addParticipants = function(convId, participants) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.ws.send(getAddParticipantsMsg(_self, resolve, reject, convId, participants));
    });
};

Circuit.prototype.addRTCParticipants = function(RTCsession, participants) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.ws.send(getAddRTCParticipantsMsg(_self, resolve, reject, RTCsession, participants));
    });
};

Circuit.prototype.disableGuestAccess = function(convId, disabled) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.ws.send(getGuestAccessDisabledMsg(_self, resolve, reject, convId, disabled));
    });
};

Circuit.prototype.getUserActivities = function(number) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.ws.send(getGetActivitiesMsg(_self, resolve, reject, number));
    });
};

Circuit.prototype.addText = function(convId, msg) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepareAttachment(((msg.attachments) ? msg.attachments : ''), (attachments) => {
            _self.ws.send(getAddTextMsg(_self, resolve, reject, convId,
                                            ((msg.parentId) ? msg.parentId : false),
                                            ((msg.subject) ? msg.subject : ''),
                                            ((msg.content) ? msg.content : ((typeof msg === 'string') ? msg : '')),
                                            attachments)
                                        );
        });
    });
};

Circuit.prototype.prepareAttachment = function(attachments, cb) {
    const _self = this;
    let attached = [];
    let allFileIds = [];
    if (typeof attachments === 'undefined' || !attachments instanceof Array || attachments.length <= 0) {
        cb('');
        return;
    }
    async.eachSeries(attachments, function(attachment, next) {
        let options = {
            hostname: _self.server,
            port: 443,
            // itemid is the same for all requests belonging to 1 conversation entry
            path: '/fileapi?itemid=' + ((attached.length == 0) ? 'NULL' : attached[0].itemId),
            method: 'POST',
            rejectUnauthorized: false,
            headers: {
                'User-Agent': user_agent,
                //content-type not required. file-api will tell us :-P
                //'Content-Type': attachment.type,
                'Content-Disposition': 'attachment; filename="' + attachment.name + '"',
                'Cookie': _self.cookie,
                'Content-Length': attachment.data.length
            }
        };
        _self.emit('log', '>>>>> ' + getDate() + ' >>>>>\n' + util.inspect(options, { showHidden: true, depth: null, breakLength: 'Infinity' }));
        doHttpPost(options, attachment.data, (headers, data, error) => {
            if (!data instanceof Array && !data.length == 1) {
                next();
            }
            try {
                _self.emit('log', '<<<<< ' + getDate() + ' <<<<<\n' + data.toString());
                let d = JSON.parse(data.toString())[0];
                // check from response, which fileid is the new one
                for (j=0; j < d.fileid.length; j++) {
                    if (allFileIds.indexOf(d.fileid[j]) < 0) {
                        allFileIds.push(d.fileid[j]);
                        break;
                    }
                }
                attached.push({
                    itemId: d.id,
                    fileId: d.fileid[j],
                    fileName: attachment.name,
                    mimeType: d.mimeType,
                    size: attachment.data.length
                });
                next();
            }
            catch(e) {
                _self.emit('error', e);
                next();
            }
        });
    },
    function(e) {
        if (e) {
            _self.emit('error', e);
        }
        cb(JSON.stringify(attached));
    });
}

module.exports = Circuit;
