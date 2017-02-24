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
let con = new Circuit('circuitsandbox.net', 'user@email.com', 'your-password');

// generic listener
con.on('log', console.log);
con.on('error', console.error);

// listener for itemAdded events
con.on('itemAdded', (d) => {
    console.log(d);
});
// listener for itemUpdated events
con.on('itemUpdated', (d) => {
    console.log(d);
});
// listener for presence events
con.on('presence', (d) => {
    console.log(d);
});

// login and do stuff
con.login()
    .then(() => {
        // get conversations (timestamp ms, BEFORE or AFTER given timestamp, max number of conversations to return)
        con.getConversations(new Date().getTime(), 'BEFORE', '25')
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
        
        // add text to conversation without attachment (conversation ID, subject, content, array of attachments)
        con.addText('12345678-90ab-cdef-1234-567890abcdef', 'Subject', '<b><i>Content</i></b>', '')
            .then(res => {
                console.log(res);
            })
            .catch(err => {
                console.error(err);
            });
                
        // add text to conversation including attachment(conversation ID, subject, content, array of attachments)
        let attachments = [
                            {name: 'Slides.pdf', data: fs.readFileSync('./some-pdf-file.pdf')},
                            {name: 'Screenshot.png', data: fs.readFileSync('./some-screenshot.png')},
                         ];
        con.addText('12345678-90ab-cdef-1234-567890abcdef', 'Subject', '<b><i>Content</i></b>', attachments)
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