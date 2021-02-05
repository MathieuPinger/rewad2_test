// redirect to index if no Prolific ID is stored
//console.log(sessionStorage.getItem('prolific_id'));
window.onload = function() {
    if(sessionStorage.getItem('prolific_id') === null) {
        window.location.assign('index.html');
    }
};

// path to param data
let prolific_id = sessionStorage.getItem('prolific_id');
let dataPath = `data/${prolific_id}_params_exp2.json`;
let continueButton = document.querySelector('#continue');

// check for params file every 3 seconds and enable/disable button
searchFile = setInterval(function() {

    let xhr = new XMLHttpRequest();
    // HEAD request: look for file without loading
    xhr.open('HEAD', dataPath, true);
    xhr.onload = function() {
        console.log(xhr.status);
        if (xhr.status == "404") {
            continueButton.disabled = true;
        } else {
            continueButton.disabled = false;
            clearInterval(searchFile);
        };
    }
    xhr.send();
}, 3000);

// run experiment on button click
continueButton.addEventListener(
    'click',
    () => {
        runExperiment(dataPath);
    });


    function runExperiment(dataPath) {
        /*
        RUN EXPERIMENT
        - loads json trial
        - converts json data to an array of trial objects
        - calls run2FC (2-forced-choice) function with the trial array
        */
    
        //console.log(dataPath);
        //console.log(sessionStorage.getItem('prolific_id'));
        
        
        // AJAX get request
        let xhr = new XMLHttpRequest();
        xhr.open('GET', dataPath, true);
        xhr.onload = function() {
    
            // load and parse JSON
            let trialObj = JSON.parse(this.responseText);
            console.log(trialObj);
            
            // object to array
            let trialList = Object.values(trialObj);
            console.log(trialList);
    
            // round trial Options to 2 digits
            trialList.forEach(trial => {
                trial['immOpt'] = parseFloat(trial['immOpt']).toFixed(2);
                trial['delOpt'] = parseFloat(trial['delOpt']).toFixed(2);
            });
    
            // TESTING: only use first 5 trials
            trialList = trialList.slice(0, 5);
            console.log(trialList);
    
            // create jsPsych timeline
            let trialTimeline = createTimeline(trialList);
            console.log(trialTimeline);
            
            // run 2 forced choice task
            run2FC(trialTimeline);
    
        }
        xhr.send();
    
    };
    
    function createTimeline(trialArray) {
        /*
        input: array of Objects with immOpt, delOpt, delay
        output: jsPsych-Timeline with html stimuli
        */
        const trialTimeline = [];
    
        // add trials to timeline: loop through trialList
        trialArray.map(trial => {
            // create random number: 0 or 1
            // rando == 0 -> immediate left; rando == 1 -> immediate right
            trial.rando = Math.round(Math.random());
    
            let trialData = {
                // 
                stimulus: constructStim(trial.rando, trial.immOpt, trial.delOpt, trial.delay),
    
                data: {
                    immOpt: trial.immOpt,
                    delOpt: trial.delOpt,
                    delay: trial.delay,
                    task: trial.task,
                    randomize: trial.rando
                }
            }
            trialTimeline.push(trialData);
            });
        return trialTimeline;
    };
    
    function run2FC(trialTimeline) {
        // input: jsPsych timeline (array)
        let timeline = [];
    
        // console.log("This is the trialTimeline:");
        // console.log(trialTimeline);
        let trialProcedure = {
            timeline: [
                testBlock = {
                    type: "html-keyboard-response",
                    stimulus: jsPsych.timelineVariable('stimulus'),
                    data: jsPsych.timelineVariable('data'),
                    choices: ['q', 'p'],
                    stimulus_duration: 5000,
                    trial_duration: 5000,
                    on_finish: function(data) {
                        delete data.stimulus; // not needed in csv
                        // recode button press for csv
                        if(data.key_press == 80 && data.randomize == 0){
                        data.choice = "delayed";
                        } else if(data.key_press == 81 && data.randomize == 0){
                        data.choice = "immediate";
                        } else if(data.key_press == 81 && data.randomize == 1){
                        data.choice = "delayed";
                        } else if(data.key_press == 80 && data.randomize == 1){
                        data.choice = "immediate";
                        };
                        // add timelineType
                        data.timelineType = "trial";
                    }
                },
                feedback = {
                    type: 'html-keyboard-response',
                    stimulus: function(){
                        lastChoice = jsPsych.data.getLastTrialData().values()[0].key_press;
                        lastRando = jsPsych.data.getLastTrialData().values()[0].randomize;
                        lastImmOpt = jsPsych.data.getLastTrialData().values()[0].immOpt;
                        lastDelOpt = jsPsych.data.getLastTrialData().values()[0].delOpt;
                        lastDelay = jsPsych.data.getLastTrialData().values()[0].delay;
    
                        if(lastChoice == 81){
                            trialFeedback = constructStim(lastRando, lastImmOpt, lastDelOpt, lastDelay,
                                feedback='left');
                            return trialFeedback
    
                        } else if(lastChoice == 80) {
                            trialFeedback = constructStim(lastRando, lastImmOpt, lastDelOpt, lastDelay,
                                feedback='right');
                            return trialFeedback
    
                        } else {
                            trialFeedback = `<div class = centerbox id='container'>
                            <p class = center-block-text style="color:red;">
                                Please select an option by pressing Q or P!
                            </p>`;
                            return trialFeedback
                        }
                    },
                    choices: jsPsych.NO_KEYS,
                    trial_duration: 1000,
                    on_finish: function(data) {
                        // add timelineType
                        data.timelineType = "feedback"; 
                    }
                },
                fixation = {
                    type: 'html-keyboard-response',
                    stimulus: '<div style="font-size:60px;">+</div>',
                    choices: jsPsych.NO_KEYS,
                    // jitter fixcross between 500 and 1500 ms
                    trial_duration:  Math.random() * (1500-500)+500
                  },
            ],
            timeline_variables: trialTimeline,
            randomize_order: true,
            on_finish: function() {
                let dataToSave = jsPsych.data.get().filter({timelineType: "trial"}).csv();
                saveData(dataToSave);
            }
        };
        let debrief = {
            type: "html-keyboard-response",
            stimulus: `<p>You have finished the experiment. Thank you for participating!</p>
                        <p>You can now close this browser window.</p>`,
            margin_vertical: '100px',
            choices: jsPsych.NO_KEYS
            };
        timeline.push(trialProcedure, debrief);
    
        jsPsych.init({
            timeline: timeline,
            minimum_valid_rt: 200,
            on_finish: function() {
                // save only trial data, not feedback
                let dataToSave = jsPsych.data.get().filter({timelineType: "trial"}).csv();
                saveData(dataToSave);
            },
            on_close: function(){
                let dataToSave = jsPsych.data.get().filter({timelineType: "trial"}).csv();
                saveData(dataToSave);
            }
        });
    };
    
    function saveData(data) {
        // creates object with prolific id and experiment data
        // sends json-object to php for storage
        let params = {
            "prolific_id": sessionStorage.getItem('prolific_id'),
            "data": data
        };    
        let xhr = new XMLHttpRequest();
        xhr.open('POST', 'web_API/saveExp1.php');
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function(){
        };
    
        xhr.send(JSON.stringify(params));
    };
    
    // constructor function for html stimulus
    let feedbackStyle = 'style="border: thick solid  #008000;"';
    
    function constructStim(rando, immOpt, delOpt, delay, feedback) {
        // rando = randomize left/right presentation
        // if rando == 0 -> immediate left, else right
    
        // initialize styles for feedback and options
        let feedbackStyle = 'style="border: thick solid  #008000;"';
        let immOptColor = '#005AB5';
        let delOptColor = '#DC3220';
    
        let stimString = `<div class = centerbox id='container'>
        <p class = center-block-text>
            Please select the option that you would prefer pressing
            <strong>'q'</strong> for left
            <strong>'p'</strong> for right:
        </p>
        <div class='table'>
        <div class='row'>
        <div class = 'option' id='leftOption' ${feedback=='left' ? feedbackStyle : null}>
            <center><font color=${rando==0 ? immOptColor : delOptColor}>
            ${rando==0 ? immOpt : delOpt} €
            <br>
            ${rando==0 ? 'Today' : `in ${delay} days`}
            </font></center></div>
        <div class = 'option' id='rightOption' ${feedback=='right' ? feedbackStyle : null}>
            <center><font color=${rando==0 ? delOptColor : immOptColor}>
            ${rando==0 ? delOpt : immOpt} €
            <br>
            ${rando==0 ? `in ${delay} days` : 'Today'}
            </font></center></div></div></div></div>`;
            return stimString;
    };