const { verifyAccess } = require('../../controllers/auth/tokens');

module.exports.ensureAuth = (req,res,next)=>{
  try{
    const h=req.headers.authorization||''; const t=h.startsWith('Bearer ')?h.slice(7):null;
    if(!t) return res.status(401).json({error:'Missing token'});
    const p=verifyAccess(t); req.user={id:p.sub,role:p.role||'USER'}; return next();
  }catch(e){return res.status(401).json({error:e.name==='TokenExpiredError'?'Token expired':'Invalid token'});}
};
