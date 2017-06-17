# circuit-api-sdk

Install:
```bash
git clone https://github.com/mailsvb/circuit-api-sdk.git
cd circuit-api-sdk
npm install .
```

Usage:
```javascript
const Circuit = require('circuit-api-sdk');
const fs = require('fs');

// login with REGULAR account data. session is made persistent, so generated cookie can be used to login in again. cookie is valid for 90 days
let con = new Circuit({server:'circuitsandbox.net',username:'user@email.com',password:'your-password',persistent:true});
// login with COOKIE, generated by regular login setting persistent=true
let con = new Circuit({server:'circuitsandbox.net',cookie:'connect.sess=XXXX'});
// login with CLIENT_CREDENTIALS, which can also be made persistent
let con = new Circuit({server:'circuitsandbox.net',client_id:'1234567890abcdef1234567890abcdef',client_secret:'1234567890abcdef1234567890abcdef',persistent:true});

// generic listener
con.on('log', console.log);
con.on('error', console.error);

// listener for item added events
con.on('itemAdded', console.log);

// listener for item updated events
con.on('itemUpdated', console.log);

// listener for item read events
con.on('itemRead', console.log);

// listener for presence events
con.on('presence', console.log);

// listener for activity created events
con.on('activityCreated', console.log);

// listener for activity read events
con.on('activityRead', console.log);

// login and do stuff
con.login()
    .then(user => {
        // user object contains information about logged in user, including cookie for reusing
        console.log(user);
    
        // get conversations (timestamp ms, BEFORE or AFTER given timestamp, max number of conversations to return)
        con.getConversations(new Date().getTime(), 'BEFORE', '25')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // get a conversation by Id (conversation ID)
        con.getConversationById('12345678-90ab-cdef-1234-567890abcdef')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // get user objects from email address (array of user email addresses)
        con.getUsersByMail(["user1@email.com", "user2@email.com"])
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // get user objects from user IDs (array of user IDs)
        con.getUsersByIds(['12345678-90ab-cdef-1234-567890abcdef', '12345678-90ab-cdef-1234-567890abcdef'])
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
            
        // create group conversation (array of userIds, optional title)
        con.createGroupConv(['12345678-90ab-cdef-1234-567890abcdef','12345678-90ab-cdef-1234-567890abcdef'], 'Group conv title')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // add participants to conversation (conversation ID, array of user IDs)
        con.addParticipants('12345678-90ab-cdef-1234-567890abcdef', '["12345678-90ab-cdef-1234-567890abcdef", "12345678-90ab-cdef-1234-567890abcdef"]')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // add participants to RTC event (conversation ID, user IDs)
        con.addRTCParticipants('12345678-90ab-cdef-1234-567890abcdef', '12345678-90ab-cdef-1234-567890abcdef')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // become a moderator of a conversation (conversation ID)
        con.moderation('12345678-90ab-cdef-1234-567890abcdef')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
            
        // set other users as moderators of a conversation (conversation ID, array of user IDs)
        con.setModerators('12345678-90ab-cdef-1234-567890abcdef', ["12345678-90ab-cdef-1234-567890abcdef", "12345678-90ab-cdef-1234-567890abcdef"])
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // disable guest access for a group conversation (conversation ID, 'true' / 'false')
        con.disableGuestAccess('12345678-90ab-cdef-1234-567890abcdef', 'true')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
            
        // get items in activity stream of user (number of items)
        con.getUserActivities('20')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // add simple text to conversation
        con.addText('12345678-90ab-cdef-1234-567890abcdef', '<b><i>Content</i></b>')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // add simple text and mention users, combined with get user by mail
        con.getUsersByMail(["user1@email.com", "user2@email.com"])
            .then(res => {
                let msg = {
                    subject: 'Subject',
                    content: '<span class=\\"mention\\" abbr=\\"' + res[0].userId + '\\">@user1</span><span class=\\"mention\\" abbr=\\"' + res[1].userId + '\\">@user2</span>',
                    mentions: [res[0].userId,res[1].userId]
                }
                con.addText('12345678-90ab-cdef-1234-567890abcdef', msg);
            })
            .catch(err => {
                console.error(err);
            });
         
        // add text including subject with optional attachment(object with parentId, subject, content and array of attachments)
        let msg = {
            parentId: '12345678-90ab-cdef-1234-567890abcdef',
            subject: 'Subject',
            content: '<b><i>Content</i></b>',
            attachments =   [
                                {name: 'Slides.pdf', data: fs.readFileSync('./some-pdf-file.pdf')},
                                {name: 'Screenshot.png', data: fs.readFileSync('./some-screenshot.png')},
                            ];
        con.addText('12345678-90ab-cdef-1234-567890abcdef', msg)
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // get all marked conversations (muted and favorites)
        con.getMarkedConversations()
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // set presence state of user (state one of 'AVAILABLE', 'OFFLINE', 'BUSY', 'DND', 'AWAY')
        con.setPresence({state:'AVAILABLE',longitude:'10.00',latitude:'50.00',location:'Berlin, Deutschland',status:'My Status'})
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // subscribe presence state of users
        con.subscribePresence(['12345678-90ab-cdef-1234-567890abcdef'])
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // update User
        con.updateUser({userId:'12345678-90ab-cdef-1234-567890abcdef',firstName:'John',lastName:'Doe'})
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // configure your Circuit voicemail with optional attachment for personal greeting(object with enabled, timeout, customGreeting and array of 1 attachment)
        let config = {
            enabled: true,
            timeout: '45',
            customGreeting: true,
            attachments =   [
                                {name: 'recording.wav', data: fs.readFileSync('./recording.wav')}
                            ];
        con.setVoicemail(config)
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
        
        // logout from current session
        con.logout();
        
        // exit current session
        con.exit();
    })
    .catch(err => {
        console.error(err);
    });
```