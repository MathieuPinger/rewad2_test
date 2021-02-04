#!C:/Anaconda/python.exe

# change shebang according to system
###!/usr/lib/python-virtualenvs/rewad/bin/python

# Test script: integrate bevavioral data from website to optimization
#def main(id):
# import libraries
import numpy as np                          #scientific computing
#import xlsxwriter
from scipy import optimize
import pandas as pd                         #import data
import json
import sys

id = sys.argv[1]
#id = "hulla"

# define necessary functions
#------------------------------------------------------------------------------
# optimize model
def optimizeModel(delay, r1, r2, a):
    
    eps=1e-9    #precision of optimizer
    ninits=100  #number of initial conditions for optimization
    
    LL=np.ndarray((ninits,1))
    pars=np.ndarray((ninits,2))
    for i in range(0,ninits):
        #draw initial conditions for optimization algo:
        betainit= np.random.uniform(low=0.0, high=100.0, size=None)
        kappainit= np.random.uniform(low=0.0, high=10.0, size=None)
        pars0=[betainit, kappainit]
            
        minimize_method='L-BFGS-B' #optimizatin method used

        ##optimization without bound
        #result=optimize.minimize(getLikelihoodHyperbolic, pars0 ,(a,r1,r2,delay), options={'eps': eps}) 
        
        #bounded optimization
        #kappabounds=np.array([0,10])
        #betabounds=np.array([0,10])
        #bnds = optimize.Bounds(betabounds, kappabounds, keep_feasible = True)

        bnds = ((0, 100), (0, 10))  #upper and lower bounds used for bounded optimization
        result=optimize.minimize(fun=getNegLikelihoodHyperbolic, 
                                x0=pars0, 
                                args=(a,r1,r2,delay), 
                                method = minimize_method, 
                                bounds = bnds,
                                options={'eps': eps}) 
    
        pars[i,:]=result.x
        LL[i]=-getNegLikelihoodHyperbolic(pars[i,:], a, r1, r2, delay)
    
    #find maximum and return best params and log likelihood
    arr=np.amax(LL)
    tmp=LL==arr
    for i in range(0,len(tmp)):
        if tmp[i]:
            index=i
    betawin=pars[index,0]
    kappawin=pars[index,1]
    LLwin=LL[index]
    
    return betawin, kappawin, LLwin

#------------------------------------------------------------------------------
# get log likelihoood of hyperbolic model
def getNegLikelihoodHyperbolic(pars, a, r1, r2,delay):
    
    beta,kappa=pars # beta= choice param, kappa= discounting param
    T=len(a)

    #model inits
    L = np.ndarray((T,1))
    V = np.ndarray((T,2))
    V[:,0]=r1.transpose()                           # values for immediate choice
    discountfact=discountfun(kappa,delay)*r2
    V[:,1]=discountfact.transpose()                 # values for delayed choise
        
    #compute log-likelihood
    for t in range(T):
        Vt=V[t,a[t]-1]
        V1=V[t,0]
        V2=V[t,1]
        
        ebV1=np.exp(beta*V1)
        ebV2=np.exp(beta*V2)
        
        L[t]=beta*Vt-np.log(np.sum(ebV1+ ebV2))

    logL=np.sum(L)
    return -logL

#------------------------------------------------------------------------------
# discounting function of hyperbolic model
def discountfun(kappa, delay):
    return 1/(1+kappa*delay)


#------------------------------------------------------------------------------
# generate paradigm B based on best param estimates
def generateParadigm(delays, r2s, pars):
    
    kappa, beta=pars

    prob_imm=[.3, .5, .7] #generated probs
    
    X, Y, Z=np.meshgrid(delays, r2s, prob_imm)
    X=X.flatten()
    Y=Y.flatten()
    Z=Z.flatten()
    trials=np.stack((X.transpose(), Y.transpose(), Z.transpose()))
    trials=trials.transpose()
    ntrials, zsp=np.shape(trials)
    
    p1=np.ndarray((ntrials,1))
    r1=np.ndarray((ntrials,1))
    r2=np.ndarray((ntrials,1))
    delay=np.ndarray((ntrials,1))
    for i in range(ntrials):
        t=trials[i,0]
        r2t=trials[i,1]
        p1t=trials[i,2]
        r1t=discountfun(kappa,t)*r2t + (np.log(p1t/(1-p1t)))/beta
        
        p1[i], r1[i], r2[i], delay[i]=p1t, r1t, r2t, t
        
    return delay, r1, r2, p1

# input and output paths
rootpath = "../data/"
inputfile= f"{id}_exp1.csv"
outputfile=f"{id}_params_exp2.json"
outputfile2=f"{id}_params_exp2_z.csv"

# input file
filein= rootpath + inputfile

# output files
outputjson= rootpath + outputfile
outputxlsx= rootpath + outputfile2

# load data to pandas then convert to numpy arrays
datain = pd.read_csv(filein)
datain = datain[["immOpt", "delOpt", "delay", "choice", "task"]]

# drop missing values
datain = datain.dropna()

# replace missing values with zero
datain = datain.fillna(0)

# choice: replace "immediate" with 1 and "delayed" with 2
datain["choice_relabel"] = datain["choice"].replace({"immediate": 1,
                                                    "delayed": 2})
# split in loss and reward dfs
datain_reward = datain[datain["task"] == "reward"]
datain_loss = datain[datain["task"] == "loss"]

# use absolute values for loss
datain_loss = datain_loss.assign(immOpt = -datain_loss['immOpt'])
datain_loss = datain_loss.assign(delOpt = -datain_loss['delOpt'])

# Function to estimate parameters for each df
def estimateParameters(df, task):
    # create input arrays for functions
    r1 = df[["immOpt"]].to_numpy()
    r2 = df[["delOpt"]].to_numpy()
    delay = df[["delay"]].to_numpy()
    a = df[["choice_relabel"]].to_numpy()
    
    # optimize model and return best param estimates
    beta, kappa, LL=optimizeModel(delay, r1, r2, a)
    print("inferred params: beta="+np.str(beta)+ ", kappa="+np.str(kappa)+ ", logL=" + np.str(LL))
    
    # generate paradigm B based on these params and given delays and rewards
    #(note: these also define the # of trials)
    pars=[kappa, beta]      
    r2s=[1, 5, 10, 15, 20]          # define delayed rewards used for task B
    delays=[1, 2, 3, 5, 10, 20, 50] # define delays used for task B
    delay_B, r1_B, r2_B, p_imm = generateParadigm(delays, r2s, pars)
    
    
    # generate id for trials
    trials_id = list(range(1, len(delay_B)+1))
    
    # pandas dataframe to json
    delay_B = delay_B.flatten().tolist()
    r1_B = r1_B.flatten().tolist()
    r2_B = r2_B.flatten().tolist()
    p_imm = p_imm.flatten().tolist()
    
    outdata_df = pd.DataFrame(
        {'id': trials_id,
        'immOpt': r1_B,
        'delOpt': r2_B,
        'delay': delay_B,
        'task': task,
        'p_imm': p_imm})
    
    return outdata_df

# generate params for each task and merge to outfile
params_reward = estimateParameters(datain_reward, "reward")
params_loss = estimateParameters(datain_loss, "loss")

# convert loss values to negative
params_loss = params_loss.assign(immOpt = -params_loss['immOpt'])
params_loss = params_loss.assign(delOpt = -params_loss['delOpt'])

outdata = params_reward.append(params_loss)

# reassign id (unique id)
outdata['id']=np.arange(len(outdata))+1
outdata = outdata.set_index('id')

# json format (exclude probabilites for json)
json_outdata = outdata.drop(['p_imm'], axis = 1)
json_outdata = outdata.to_json(orient = "index")
json_outdata = json.loads(json_outdata)

# Open a json writer, and use the json.dumps()  
# function to dump data 
with open(outputjson, 'w', encoding='utf-8') as jsonf: 
    jsonf.write(json.dumps(json_outdata, indent=4)) 
    json.dumps(json_outdata, indent=4)  

# write csv with added probabilites
outdata.to_csv(outputxlsx)

# import sys
# try:
#     with open('started.log', 'w') as f:
#         f.write(str(sys.argv))


#     main(sys.argv[1])

#     with open('finished.log', 'w') as f:
#         f.write(sys.modules.keys())
# except Exception as e:
#     with open('err.log', 'w') as f:
#         f.write(str(e) + repr(e))