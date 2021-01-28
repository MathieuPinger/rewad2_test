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

// function to run experiment with specified json file
function runExperiment(dataPath) {
    console.log(dataPath);
    console.log(sessionStorage.getItem('prolific_id'));
    
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

// function createTimeline(trialArray) {
//     // input array: immOpt, delOpt, delay
//     // output jsPsych-Timeline: html stimuli

//     // initialize timeline
//     const trialTimeline = [];

//     // add trials to timeline: loop through trialList
//     trialArray.map(trial => {
//         let trialData = {
//             stimulus:
//             `<div class = centerbox id='container'>
//             <p class = center-block-text>
//                 Please select the option that you would prefer pressing
//                 <strong>'q'</strong> for left
//                 <strong>'p'</strong> for right:
//             </p>
//             <div class='table'>
//             <div class='row'>
//             <div id = 'option'><center><font color='green'>
//                 ${trial.immOpt}
//             <br>
//                 Today
//             </font></center></div>
//             <div id = 'option'><center><font color='green'>
//                 ${trial.delOpt}
//             <br>
//                 in ${trial.delay} days
//             </font></center></div></div></div></div>`,

//             data: {
//                 immOpt: trial.immOpt,
//                 delOpt: trial.delOpt,
//                 delay: trial.delay
//             }
//         }
//         trialTimeline.push(trialData);
//         });
//     return trialTimeline;
// };

function createTimeline(trialArray) {
    /*
    input: array of Objects with immOpt, delOpt, delay
    output: jsPsych-Timeline with html stimuli
    */
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

    let trialProcedure = {
        timeline: [
            testBlock = {
                type: "html-keyboard-response",
                stimulus: jsPsych.timelineVariable('stimulus'),
                data: jsPsych.timelineVariable('data'),
                choices: ['q', 'p'],
                stimulus_duration: 4000,
                trial_duration: 4000,
                on_finish: function(data) {
                    delete data.stimulus; // not needed in csv
                    // recode button press for csv
                    if(data.key_press == 80){
                    data.choice = "delayed";
                    } else if(data.key_press == 81){
                    data.choice = "immediate";
                    };
                    // add timelineType
                    data.timelineType = "trial";
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
                trial_duration: 500,
                on_finish: function(data) {
                    // add timelineType
                    data.timelineType = "feedback"; 
                }
            }
        ],
        timeline_variables: trialTimeline,
        randomize_order: true
    };
    timeline.push(trialProcedure);

    jsPsych.init({
        timeline: timeline,
        minimum_valid_rt: 200,
        on_finish: function() {
            // save only trial data, not feedback
            dataToSave = jsPsych.data.get().filter({timelineType: "trial"}).csv();
            saveData(dataToSave);
            //jsPsych.data.displayData('json');
            jsPsych.endExperiment(
                `You have finished the experiment.
                Thank you for participating!`);
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
    xhr.open('POST', 'web_API/saveExp2.php');
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
};