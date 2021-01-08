#!/usr/bin/env python3
# -*- coding: utf-8 -*-

#including libraries
import numpy as np                          #scientific computing
import scipy as sp
import xlsxwriter
from scipy import optimize
from IPython.core.debugger import set_trace #debugging
import pandas as pd                         #import data
import math


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




#---------------------------------MAIN-----------------------------------------
# input path and data file
pati = "C:\\Users\\georg\\Desktop\\TRR265\\B08\\derivations_online_task\\"
inputfile= "ID9999_taskA_behavior.xlsx"
outputfile='ID9999_taskB_trials.xlsx'
outputfile2='ID9999_taskB_trials_z.xlsx'

filein= pati + inputfile
fileout= pati + outputfile
fileout2= pati + outputfile2

print(filein)

# load data 
r1=pd.read_excel(filein, usecols=[0]).to_numpy()
r2=pd.read_excel(filein, usecols=[1]).to_numpy()
delay=pd.read_excel(filein, usecols=[2]).to_numpy()
a=pd.read_excel(filein, usecols=[3]).to_numpy()
 
# optimize model and return best param estimates
beta, kappa, LL=optimizeModel(delay, r1, r2, a)
print("inferred params: beta="+np.str(beta)+ ", kappa="+np.str(kappa)+ ", logL=" + np.str(LL))


# generate paradigm B based on these params and given delays and rewards
#(note: these also define the # of trials)
pars=[kappa, beta]      
r2s=[1, 5, 10, 15, 20]          # define delayed rewards used for task B
delays=[1, 2, 3, 5, 10, 20, 50] # define delays used for task B
delay_B, r1_B, r2_B, p_imm = generateParadigm(delays, r2s, pars)

#now print to excel file for paradigm program
wb = xlsxwriter.Workbook(fileout)
ws = wb.add_worksheet('my sheet')
ws.write_row(0, 0, ['delay', 'imm rew', 'del rew'])

for i in range(len(delay_B)):
    ws.write_row(i+1, 0, [r1_B[i],r2_B[i], delay_B[i]])

wb.close()

#write additional excel file with manipulated probabilities
wb = xlsxwriter.Workbook(fileout2)
ws = wb.add_worksheet('my sheet')
ws.write_row(0, 0, ['delay', 'imm rew', 'del rew', 'p_imm'])

for i in range(len(delay_B)):
    ws.write_row(i+1, 0, [r1_B[i],r2_B[i], delay_B[i], p_imm[i]])

wb.close()



