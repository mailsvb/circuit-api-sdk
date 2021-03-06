const util          = require('util');
const EventEmitter  = require('events').EventEmitter;
const NodeWebSocket = require('ws');
const https         = require('https');
const querystring   = require('querystring');
const async         = require('async');
const Entities      = require('html-entities').AllHtmlEntities;
const entities      = new Entities();
const user_agent    = 'Mozilla/5.0 (Linux; 1.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome apisdk/1.0';
const allowed_states= ['AVAILABLE', 'OFFLINE', 'BUSY', 'DND', 'AWAY', 'BE_RIGHT_BACK'];

const getLogonMsg = function(_self) {
    let r = '{"msgType":"REQUEST","request":{"requestId":' + _self.nextReqID() + ',"type":"USER","user":{"type":"LOGON","logon":{"updateLastAccessTime":true,"securityTokenType":["PERSISTENT_SESSION"]}}}}';
    return r;
};
const getLogoutMsg = function(_self) {
    let r = '{"msgType":"REQUEST","request":{"requestId":' + _self.nextReqID() + ',"type":"USER","user":{"type":"LOGOUT","logoff":{"invalidate":false}}}}';
    return r;
};
const getStartupMsg = function(_self) {
    let r = '{"msgType":"REQUEST","request":{"requestId":' + _self.nextReqID() + ',"type":"VERSION","version":{"type":"GET_VERSION"}}}';
    return r;
};
const getDoStuffMsg = function(_self) {
    let r = '{"msgType":"REQUEST","request":{"requestId":' + _self.nextReqID() + ',"type":"USER","user":{"type":"GET_STUFF","getStuff":{"types":["USER","ACCOUNTS","PRESENCE_STATE"]}}}}';
    return r;
};
const getUpdateUserMsg = function(_self, resolve, reject, userId, firstName, lastName) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"USER","user":{"type":"UPDATE","update":{"userId":"' + userId + '"' + ((firstName) ? ',"firstName":"' + firstName + '"' : '') + ((lastName) ? ',"lastName":"' + lastName + '"' : '') + '}}}}';
    return r;
};
const getSetPresenceMsg = function(_self, resolve, reject, state, longitude, latitude, location, status) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"USER","user":{"type":"SET_PRESENCE","presence":{"state":"' + state + '","inTransit":false,"mobile":false' + ((longitude) ? ',"longitude":' + longitude : '') + ((latitude) ? ',"latitude":' + latitude : '') + ((location) ? ',"locationText":"' + location + '"' : '') + ((status) ? ',"statusMessage":"' + status + '"' : '') + '}}}}';
    return r;
};
const getSubscribePresenceMsg = function(_self, resolve, reject, userIds) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"USER","user":{"type":"SUBSCRIBE_PRESENCE","subscribePresence":{"userIds":' + userIds + '}}}}';
    return r;
};
const getAddTextMsg = function(_self, resolve, reject, convId, parentId, subject, content, mentions, attachment) {
    (attachment) ? attachment = attachment : attachment = '[]';
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"ADD_TEXT_ITEM","addTextItem":{"convId":"' + convId + '","contentType":"RICH","subject":"' + subject + '","content":"' + content + '","attachmentMetaData":' + attachment + ',"externalAttachmentMetaData":[],"preview":null,"mentionedUsers":' + ((mentions) ? mentions : '[]') + ((parentId) ? (',"parentId":"' + parentId + '"') : '' ) + '}}}}';
    return r;
};
const getAddParticipantsMsg = function(_self, resolve, reject, convId, participants) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"ADD_PARTICIPANT","addParticipant":{"convId":"' + convId + '","locale":"EN_US","userId":' + participants + '}}}}';
    return r;
};
const getAddRTCParticipantsMsg = function(_self, resolve, reject, RTCsession, participants) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"RTC_SESSION","rtcSession":{"type":"ADD_PARTICIPANT","addParticipant":{"rtcSessionId":"' + RTCsession + '","userId":"' + participants + '","mediaType":["AUDIO","VIDEO"]}}}}';
    return r;
};
const getGetConversationsMsg = function(_self, resolve, reject, date, direction, number) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"GET_CONVERSATIONS","getConversations":{"userId":"' + _self.userId + '","modificationDate":' + date + ',"direction":"' + direction + '","number":' + number + ',"filter":"ALL"}}}}';
    return r;
};
const getGetConversationByIdMsg = function(_self, resolve, reject, convid) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"GET_CONVERSATION_BY_ID","getConversationById":{"convId":"' + convid + '"}}}}';
    return r;
};
const getGetMarkedConversationsMsg = function(_self, resolve, reject) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"GET_MARKED_CONVERSATIONS_LIST"}}}';
    return r;
};
const getGetUsersByMailMsg = function(_self, resolve, reject, mail) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"USER","user":{"type":"GET_USERS_BY_MAILS","getUsersByMails":{"emailAddresses":' + mail + ',"excludeRoles":["SUPPORT"]}}}}';
    return r;
};
const getGetUsersByIDsMsg = function(_self, resolve, reject, userids) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"USER","user":{"type":"GET_USERS_BY_IDS","usersByIds":{"userIds":' + userids + '}}}}';
    return r;
};
const getCreateGroupConvMsg = function(_self, resolve, reject, participants, topic) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"CREATE","create":{"type":"GROUP","topic":"' + topic + '","participants":' + participants + '}}}}';
    return r;
};
const getModeratorConvMsg = function(_self, resolve, reject, convId) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"MODERATE_CONVERSATION","moderateConversation":{"convId":"' + convId + '"}}}}';
    return r;
};
const getGuestAccessDisabledMsg = function(_self, resolve, reject, convId, disabled) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"UPDATE_GUEST_ACCESS","updateGuestAccess":{"convId":"' + convId + '","guestAccessDisabled":' + disabled + '}}}}';
    return r;
};
const getGrantModeratorConvMsg = function(_self, resolve, reject, convId, userIds) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"CONVERSATION","conversation":{"type":"GRANT_MODERATOR_RIGHTS","grantModeratorRights":{"convId":"' + convId + '","userId":' + userIds + '}}}}';
    return r;
};
const getGetActivitiesMsg = function(_self, resolve, reject, number) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"ACTIVITYSTREAM","activityStream":{"type":"GET_ACTIVITIES_BY_USER","getActivitiesByUser":{"timestamp":null,"numberOfItems":' + number + '}}}}';
    return r;
};
const getSetVoicemailMsg = function(_self, resolve, reject, enabled, timeout, customGreeting, fileId) {
    let nextId = _self.nextReqID();
    _self.resolver[nextId] = resolve;
    _self.rejecter[nextId] = reject;
    let customGreetingFileId = (fileId) ? ',{"key":"VOICEMAIL_CUSTOMGREETING_URI","dataType":"STRING","stringValue":"' + fileId + '"}' : '';
    let r = '{"msgType":"REQUEST","request":{"requestId":' + nextId + ',"type":"USER","user":{"type":"SET_USER_SETTINGS","setUserSettings":{"settings":[{"key":"VOICEMAIL_ENABLED","dataType":"BOOLEAN","booleanValue":' + ((enabled) ? 'true' : 'false') + '},{"key":"VOICEMAIL_TIMEOUT","dataType":"NUMBER","numberValue":' + timeout + '},{"key":"VOICEMAIL_CUSTOMGREETING_ENABLED","dataType":"BOOLEAN","booleanValue":' + ((customGreeting) ? 'true' : 'false') + '}' + customGreetingFileId + ']}}}}';
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
    this.reconnecting   = false;
    this.manuallogout   = false;
    this.pingInterval   = false;
    this.wspingInterval = false;
    this.lastpong       = 0;
    this.loginattempts  = 0;
    this.reqID          = 0;
    this.logindelay     = 0;
    this.server         = data.server;
    this.persistent     = data.persistent || false;
    if (data.username && data.password) {
        this.credentials = querystring.stringify({
                                'username'  : data.username,
                                'password'  : data.password,
                                'persistent': ((data.persistent) ? 'true' : 'false')
                              });
    }
    if (data.client_id && data.client_secret) {
        this.basicauth = new Buffer(data.client_id + ":" + data.client_secret).toString('base64');
    }
    this.cookie         = null;
    if (data.cookie) {
        this.cookie = data.cookie;
    }
    this.ws             = null;
    this.resolver       = {};
    this.rejecter       = {};
    
    this.nextReqID = function() {
        this.reqID += 1;
        return this.reqID;
    };
    
    this.getLoginDelay = () => {
        if (this.logindelay < 60000) {
            this.logindelay += 10000;
        }
        return this.logindelay;
    }
    
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
                    return _self.getWS();
                }
            }
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
        });
    };
    
    this.getWS = () => {
        _self.emit('log', '>>>>> trying to connect to API');
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
    _self.loginattempts = 0;
    _self.logindelay = 0;
    _self.lastpong = parseInt(new Date().getTime());
    _self.prepwssend(getLogonMsg(_self));
    _self.prepwssend(getStartupMsg(_self));
    _self.prepwssend(getDoStuffMsg(_self));
    _self.wspingInterval = setInterval(() => {
        if ((parseInt(new Date().getTime()) - _self.lastpong) > 30000) {
            _self.emit('error', '<<<<< PING ERROR');
            _self.ws.terminate();
        }
        else {
            _self.ws.ping('', false, false);
        }
    }, 5000);
};

Circuit.prototype.wsmessage = function(data, flags) {
    const _self = this;
    try {
        _self.emit('log', '<<<<< ' + data.toString());
        data = JSON.parse(data.toString());
        if (data.msgType == 'RESPONSE' && data.response.type == 'USER' && data.response.user.type == 'GET_STUFF') {
            if (data.response.user.getStuff.user) {
                _self.clientId = data.clientId;
                _self.userId = data.response.user.getStuff.user.userId;
                _self.displayName = data.response.user.getStuff.user.displayName;
            }
            if (_self.persistent) {
                data.response.user.getStuff.user.cookie = _self.cookie;
            }
            // on reconnection emit reconnection event
            if (_self.reconnecting) {
                _self.reconnecting = false;
                _self.emit('reconnection');
            }
            // only on first connection attempt
            else {
                return _self.resolver['login'](data.response.user.getStuff.user);
            }
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
                            case 'GET_CONVERSATION_BY_ID':
                                return resolve(data.response.conversation.getConversationById.conversation);
                                break;
                            case 'GET_MARKED_CONVERSATIONS_LIST':
                                return resolve(data.response.conversation.getMarkedConversationsList);
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
                            case 'GET_USERS_BY_IDS':
                                return resolve(data.response.user.usersByIds.user);
                                break;
                            case 'SET_PRESENCE':
                                return resolve(data.response.user.setPresence.state);
                                break;
                            case 'SUBSCRIBE_PRESENCE':
                                return resolve(data.response.user.subscribePresence.states);
                                break;
                            case 'UPDATE':
                                return resolve(data.response.user.updateResult.user);
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
                        break;
                    
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
                    _self.emit('itemAdded', data.event.conversation.addItem.item);
                }
                if (data.event.conversation.type == 'UPDATE_ITEM') {
                    _self.emit('itemUpdated', data.event.conversation.updateItem.item);
                }
                if (data.event.conversation.type == 'READ_ITEMS') {
                    _self.emit('itemRead', data.event.conversation);
                }
            }
            if (data.event.type == 'ACTIVITYSTREAM') {
                if (data.event.activity.type == 'ACTIVITY_CREATED') {
                    _self.emit('activityCreated', data.event.activity.create.item);
                }
                if (data.event.activity.type == 'ACTIVITY_MARKED_READ') {
                    _self.emit('activityRead', data.event.activity.markRead);
                }
            }
        }
    }
    catch(e) {
        _self.emit('error', util.inspect(e, { showHidden: true, depth: null, breakLength: 'Infinity' }));
    }
};

Circuit.prototype.prepwssend = function(msg) {
    const _self = this;
    clearInterval(_self.pingInterval);
    _self.wssend(msg);
    _self.pingInterval = setInterval(() => {
        if (_self.connected) {
            let pingMsg = 'PING|' + _self.nextReqID();
            _self.wssend(pingMsg);
        }
    }, 180000);
};

Circuit.prototype.wssend = function(msg) {
    const _self = this;
    _self.ws.send(msg);
    _self.emit('log', '>>>>> ' + msg);
};

Circuit.prototype.wserror = function(error) {
    const _self = this;
    if (error.message.match(/401/)) {
        _self.cookie = '';
    }
    _self.emit('error', '>>>>> ' + util.inspect(error.message, { showHidden: true, depth: null, breakLength: 'Infinity' }));
};

Circuit.prototype.wsping = function(data, flags) {
    const _self = this;
    _self.emit('log', '<<<<< ON_PING');
    _self.ws.pong('', false, false);
};

Circuit.prototype.wspong = function(data, flags) {
    const _self = this;
    _self.lastpong = parseInt(new Date().getTime());
};

Circuit.prototype.wsclose = function(code, msg) {
    const _self = this;
    clearInterval(_self.pingInterval);
    clearInterval(_self.wspingInterval);
    if (_self.manuallogout === false) {
        _self.reconnecting = true;
        _self.emit('disconnection');
        _self.emit('error', '>>>>> ' + code);
        setTimeout(() => {
            if (_self.cookie === '') {
                _self.getCookie();
            } else {
                _self.getWS();
            }
        }, _self.getLoginDelay());
    }
};

Circuit.prototype.encode = function(msg) {
    return entities.encodeNonUTF(msg);
};

Circuit.prototype.login = function() {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.resolver['login'] = resolve;
        _self.rejecter['login'] = reject;
        if (_self.cookie === null) {
            _self.emit('log', '>>>>> login with given credentials at: ' + _self.server);
            _self.getCookie();
        }
        else {
            _self.emit('log', '>>>>> connecting to API using given cookie: ' + _self.server);
            _self.getWS();
        }
    });
};

Circuit.prototype.logout = function() {
    const _self = this;
    _self.manuallogout = true;
    _self.prepwssend(getLogoutMsg(_self));
};

Circuit.prototype.exit = function() {
    const _self = this;
    _self.manuallogout = true;
    _self.ws.terminate();
};

Circuit.prototype.updateUser = function(user) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (!(user instanceof Object) && user.userId) {
            reject('missing uderId');
            return;
        }
        _self.prepwssend(getUpdateUserMsg(_self, resolve, reject, 
                                                user.userId,
                                                ((user.firstName) ? user.firstName : false),
                                                ((user.lastName) ? user.lastName : false)
                                                ));
    });
};

Circuit.prototype.setPresence = function(presence) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (!(presence instanceof Object)) {
            presence = {state: presence};
        }
        if (presence.state && allowed_states.indexOf(presence.state) < 0) {
            reject('unknown state:' + presence.state);
            return;
        }
        _self.prepwssend(getSetPresenceMsg(_self, resolve, reject, 
                                                presence.state,
                                                ((presence.longitude) ? presence.longitude : false),
                                                ((presence.latitude) ? presence.latitude : false),
                                                ((presence.location) ? presence.location : false),
                                                ((presence.status) ? presence.status : false)
                                                ));
    });
};

Circuit.prototype.subscribePresence = function(userIds) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (!(userIds instanceof Array)) {
            reject('not an array:' + userIds);
            return;
        }
        _self.prepwssend(getSubscribePresenceMsg(_self, resolve, reject, JSON.stringify(userIds)));
    });
};

Circuit.prototype.getConversations = function(data = {}) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getGetConversationsMsg(_self, resolve, reject, 
                                                ((data.date) ? data.date : new Date().getTime()),
                                                ((data.direction) ? data.direction : 'BEFORE'),
                                                ((data.number) ? data.number : '25'))
                                            );
    });
};

Circuit.prototype.getConversationById = function(convId) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getGetConversationByIdMsg(_self, resolve, reject, convId));
    });
};

Circuit.prototype.getMarkedConversations = function() {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getGetMarkedConversationsMsg(_self, resolve, reject));
    });
};

Circuit.prototype.moderation = function(convId) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getModeratorConvMsg(_self, resolve, reject, convId));
    });
};

Circuit.prototype.setModerators = function(convId, userIds) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getGrantModeratorConvMsg(_self, resolve, reject, convId, JSON.stringify(userIds)));
    });
};

Circuit.prototype.createGroupConv = function(participants, topic) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (typeof participants === 'undefined' || !(participants instanceof Array) || participants.length <= 0) {
            return reject(util.inspect(participants, { showHidden: true, depth: null, breakLength: 'Infinity' }) + ' is not a valid array of user IDs');
        }
        if (typeof topic === 'undefined' || !(topic instanceof String)) {
            topic = '';
        }
        let userIds = [];
        participants.forEach(id => {
            userIds.push({userId:id});
        });
        userIds.push({userId:_self.userId});
        _self.prepwssend(getCreateGroupConvMsg(_self, resolve, reject, JSON.stringify(userIds), topic));
    });
};

Circuit.prototype.getUsersByMail = function(mail) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (typeof mail === 'undefined' || !(mail instanceof Array) || mail.length <= 0) {
            return reject(util.inspect(mail, { showHidden: true, depth: null, breakLength: 'Infinity' }) + ' is not a valid array of mail addresses');
        }
        _self.prepwssend(getGetUsersByMailMsg(_self, resolve, reject, JSON.stringify(mail)));
    });
};

Circuit.prototype.getUsersByIds = function(userids) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (typeof userids === 'undefined' || !(userids instanceof Array) || userids.length <= 0) {
            return reject(util.inspect(userids, { showHidden: true, depth: null, breakLength: 'Infinity' }) + ' is not a valid array of user ids');
        }
        _self.prepwssend(getGetUsersByIDsMsg(_self, resolve, reject, JSON.stringify(userids)));
    });
};

Circuit.prototype.addParticipants = function(convId, participants) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getAddParticipantsMsg(_self, resolve, reject, convId, participants));
    });
};

Circuit.prototype.addRTCParticipants = function(RTCsession, participants) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getAddRTCParticipantsMsg(_self, resolve, reject, RTCsession, participants));
    });
};

Circuit.prototype.disableGuestAccess = function(convId, disabled) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getGuestAccessDisabledMsg(_self, resolve, reject, convId, disabled));
    });
};

Circuit.prototype.getUserActivities = function(number) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepwssend(getGetActivitiesMsg(_self, resolve, reject, number));
    });
};

Circuit.prototype.setVoicemail = function(config) {
    const _self = this;
    return new Promise((resolve, reject) => {
        _self.prepareAttachment(((config.attachments) ? config.attachments : ''), (attachments) => {
            _self.prepwssend(getSetVoicemailMsg(_self, resolve, reject,
                                            ((config.enabled) ? config.enabled : false),
                                            ((config.timeout) ? config.timeout : '30'),
                                            ((config.customGreeting) ? config.customGreeting : false),
                                            ((attachments instanceof Array && attachments.length == 1) ? attachments[0].fileId : false)
                                        ));
        });
    });
};

Circuit.prototype.addText = function(convId, msg) {
    const _self = this;
    return new Promise((resolve, reject) => {
        if (typeof msg === 'string') {
            msg = {
                content: msg
            };
        }
        _self.prepareAttachment(((msg.attachments) ? msg.attachments : ''), (attachments) => {
            _self.prepwssend(getAddTextMsg(_self, resolve, reject, convId,
                                            ((msg.parentId) ? msg.parentId : false),
                                            ((msg.subject) ? msg.subject : ''),
                                            ((msg.content) ? msg.content : ''),
                                            ((msg.mentions) ? JSON.stringify(msg.mentions) : false),
                                            ((attachments instanceof Array && attachments.length > 0) ? JSON.stringify(attachments) : false)
                                        ));
        });
    });
};

Circuit.prototype.prepareAttachment = function(attachments, cb) {
    const _self = this;
    let attached = [];
    let allFileIds = [];
    if (Array.isArray(attachments) === false || attachments.length <= 0) {
        cb('');
        return;
    }
    async.eachSeries(attachments, function(attachment, next) {
        let options = {
            hostname: _self.server,
            port: 443,
            // itemid is the same for all requests belonging to 1 conversation entry
            path: '/fileapi?itemid=' + ((attached.length === 0) ? 'NULL' : attached[0].itemId),
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
        _self.emit('log', '>>>>> ' + util.inspect(options, { showHidden: true, depth: null, breakLength: 'Infinity' }));
        doHttpPost(options, attachment.data, (headers, data, error) => {
            _self.emit('log', '<<<<< ' + data.toString());
            try {
                data = JSON.parse(data.toString());
                if (data instanceof Array && data.length == 1) {
                    data = data[0];
                    for (var j=0; j < data.fileid.length; j++) {
                        if (allFileIds.indexOf(data.fileid[j]) < 0) {
                            allFileIds.push(data.fileid[j]);
                            break;
                        }
                    }
                    attached.push({
                        itemId: data.id,
                        fileId: data.fileid[j],
                        fileName: attachment.name,
                        mimeType: data.mimeType,
                        size: attachment.data.length
                    });
                }
                else {
                    _self.emit('error', 'error handling file api response');
                }
                next();
            }
            catch(e) {
                _self.emit('error', util.inspect(e, { showHidden: true, depth: null, breakLength: 'Infinity' }));
                next();
            }
        });
    },
    function(e) {
        if (e) {
            _self.emit('error', util.inspect(e, { showHidden: true, depth: null, breakLength: 'Infinity' }));
        }
        cb(attached);
    });
};

module.exports = Circuit;
