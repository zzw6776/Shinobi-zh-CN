const { spawnSync } = require('child_process');
const treekill = require('tree-kill');

let processListerAvailable = null;
function isProcessListerAvailable(){
    if(processListerAvailable !== null)return processListerAvailable;
    if(process.platform === 'win32'){
        processListerAvailable = true;
        return processListerAvailable;
    }
    const bin = process.platform === 'darwin' ? 'pgrep' : 'ps';
    try{
        const result = spawnSync(bin, ['--version'], { stdio: 'ignore' });
        processListerAvailable = !(result.error && result.error.code === 'ENOENT');
    }catch(err){
        processListerAvailable = false;
    }
    return processListerAvailable;
}

module.exports = function safeTreeKill(pid, signal, callback){
    if(typeof signal === 'function' && callback === undefined){
        callback = signal;
        signal = undefined;
    }
    if(!isProcessListerAvailable()){
        try{
            process.kill(parseInt(pid, 10), signal);
        }catch(err){
            if(err.code !== 'ESRCH' && callback)return callback(err);
        }
        if(callback)callback();
        return;
    }
    return treekill(pid, signal, callback);
};
