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
// if a valid cookie is given, it will be used to connect to the API. Otherwise a normal login using given credentials
// login with REGULAR account data
let con = new Circuit({server:'circuitsandbox.net',username:'user@email.com',password:'your-password',cookie:'connect.sess=XXXX'});
let con = new Circuit({server:'circuitsandbox.net',client_id:'1234567890abcdef1234567890abcdef',client_secret:'1234567890abcdef1234567890abcdef',cookie:'connect.sess=XXXX'});

// generic listener
con.on('log', console.log);
con.on('error', console.error);

// listener for itemAdded events
con.on('itemAdded', console.log);

// listener for itemUpdated events
con.on('itemUpdated', console.log);

// listener for presence events
con.on('presence', console.log);

// listener for activity stream events
con.on('activityStream', console.log);

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
    })
    .catch(err => {
        console.error(err);
    });
```