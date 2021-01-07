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
    // input array: immOpt, delOpt, delay
    // output jsPsych-Timeline: html stimuli

    // initialize timeline
    const trialTimeline = [];

    // add trials to timeline: loop through trialList
    trialArray.map(trial => {
        let trialData = {
            stimulus:
            `<div class = centerbox id='container'>
            <p class = center-block-text>
                Please select the option that you would prefer pressing
                <strong>'q'</strong> for left
                <strong>'p'</strong> for right:
            </p>
            <div class='table'>
            <div class='row'>
            <div id = 'option'><center><font color='green'>
                ${trial.immOpt}
            <br>
                Today
            </font></center></div>
            <div id = 'option'><center><font color='green'>
                ${trial.delOpt}
            <br>
                in ${trial.delay} days
            </font></center></div></div></div></div>`,

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

    const timeline = [];

    let testBlock = {
        type: "html-keyboard-response",
        timeline: trialTimeline,
        choices: ['q', 'p'],
        stimulus_duration: 2000,
        trial_duration: 2000,
        on_finish: function(data) {
            delete data.stimulus;
            if(data.key_press == 80){
            data.choice = "delayed";
          } else if(data.key_press == 81){
            data.choice = "immediate";
          }
        }

    }
    timeline.push(testBlock);

    /* needed:
    post_trial_gap
    on_finish (highlight choice etc)
    */

    jsPsych.init({
        timeline: timeline,
        on_finish: function() {
            saveData(jsPsych.data.get().csv())
            window.location.assign('questionnaires.html');
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