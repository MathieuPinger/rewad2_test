// path to testfile.json
let dataPath = "testfiles/testfile.json";

// run experiment on button click
document.querySelector('#start').addEventListener(
    'click',
    () => {
        runExperiment(dataPath);
    });

// function to run experiment with specified json file
function runExperiment(dataPath) {
    console.log(dataPath);
    console.log(sessionStorage.getItem('prolific_id'));

    // get participant ID from local storage
    let prolific_id = sessionStorage.getItem('prolific_id');
    
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
        // round trial options



        // run 2 forced choice task
        run2FC(trialTimeline);

    }
    xhr.send();

};

function createTimeline(trialArray) {
    // input array: immOpt, delOpt, delay
    // output jsPsych-Timeline: html stimuli

    // initialize timeline
    const trialTimeline = [];

    // add trials to timeline: loop through trialList
    trialArray.map(trial => {
        let trialData = {
            stimulus: constructStim(trial.immOpt, trial.delOpt, trial.delay),

            data: {
                immOpt: trial.immOpt,
                delOpt: trial.delOpt,
                delay: trial.delay
            }
        }
        trialTimeline.push(trialData);
        });
    return trialTimeline;
};

function run2FC(trialTimeline) {
    // input: jsPsych timeline (array)
    let timeline = [];
    console.log("This is the trialTimeline:");
    console.log(trialTimeline);
    let trialProcedure = {
        timeline: [
            testBlock = {
                type: "html-keyboard-response",
                stimulus: jsPsych.timelineVariable('stimulus'),
                data: jsPsych.timelineVariable('data'),
                choices: ['q', 'p'],
                stimulus_duration: 2000,
                trial_duration: 2000,
                on_finish: function(data) {
                    delete data.stimulus; // not needed in csv data
                    // recode button press for csv
                    if(data.key_press == 80){
                    data.choice = "delayed";
                    } else if(data.key_press == 81){
                    data.choice = "immediate";
                    }
                }
            },
            feedback = {
                type: 'html-keyboard-response',
                stimulus: function(){
                    lastChoice = jsPsych.data.getLastTrialData().values()[0].choice;
                    lastImmOpt = jsPsych.data.getLastTrialData().values()[0].immOpt;
                    lastDelOpt = jsPsych.data.getLastTrialData().values()[0].delOpt;
                    lastDelay = jsPsych.data.getLastTrialData().values()[0].delay;

                    if(lastChoice == "immediate"){
                        trialFeedback = constructStim(lastImmOpt, lastDelOpt, lastDelay,
                            leftStyle = feedbackStyle);
                        return trialFeedback

                    } else if(lastChoice == "delayed") {
                        trialFeedback = constructStim(lastImmOpt, lastDelOpt, lastDelay,
                            leftStyle = undefined, rightStyle = feedbackStyle);
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
                    delete data.stimulus; // not needed in csv data
                }
            }
        ],
        timeline_variables: trialTimeline,
        randomize_order: true
    }
    timeline.push(trialProcedure);

    jsPsych.init({
        timeline: timeline,
        on_finish: function() {
            saveData(jsPsych.data.get().csv())
            //window.location.assign('questionnaires.html');
            //jsPsych.data.displayData('json');
        },
        on_close: function(){
            saveData(jsPsych.data.get().csv())
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
        console.log(this.responseText);
    };

    xhr.send(JSON.stringify(params));
};

// constructor function for html stimulus
let feedbackStyle = 'style="border: thick solid  #008000;"';
function constructStim(leftOpt, rightOpt, delay, leftStyle, rightStyle) {
    let stimString = `<div class = centerbox id='container'>
    <p class = center-block-text>
        Please select the option that you would prefer pressing
        <strong>'q'</strong> for left
        <strong>'p'</strong> for right:
    </p>
    <div class='table'>
    <div class='row'>
    <div class = 'option' id='leftOption' ${leftStyle || null}><center><font color='green'>
        ${leftOpt}
    <br>
        Today
    </font></center></div>
    <div class = 'option' id='rightOption' ${rightStyle || null}><center><font color='green'>
        ${rightOpt}
    <br>
        in ${delay} days
    </font></center></div></div></div></div>`;
        return stimString;
        
    }