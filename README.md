# Green-Inbox

This is a chrome extension built to automatically delete(moves to trash) selected emails after some days(30, by default). It adds unread emails to queue for deletion automatically
and removes them when user reads the email, or keeps them if email is unread. User also has the option to add or remove email to/from deletion queue. 

This chrome extension not only helps people keep their inbox clean and reduce storage, but also helps to reduce the carbon footprint produced from storing unrequired emails. It is 
estimated that - "In a year, an average person in the developed world adds 136kg of CO2 to their carbon footprint from the emails they send and receive". So by deleting unrequired
emails this extension helps reduce carbon footprint. Hence is the name of this extension "Green Inbox". 

## Features
- Handles logging in and out of multiple google accounts.
- Keeps your emails in sync if you have multiple devices
- Automatically handles scheduling unread mails. 


## Features to add
- Use an ML model to identify which emails to automatically add to deletion queue and which are important. 
- Reduce memory usage of the extension itself and make icons more user friendly. 


## Usage 
- Git Clone the repository in your local 
- Go to chrome://extensions/ , turn on developer mode. 
- Select load unpacked option and add it to chrome extension. 
- Go to <a>https://console.cloud.google.com/</a> and create credentials for the chrome app, by giving your chrome extension Id.
- In the scopes part add these 2 scopes - "https://www.googleapis.com/auth/gmail.modify" , "https://www.googleapis.com/auth/userinfo.email". 
- Get the Client Id and paste it in manifest.json and background.js at places mentioned there. 
- Reload the extension and now it will be ready to run. You can go to options page to add or remove your account and change time after which you want emails to be deleted. 

