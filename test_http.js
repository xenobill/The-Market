const http = require('http');

function req(path, method='GET', data=null, headers={}){
  return new Promise((resolve,reject)=>{
    const opts={hostname:'localhost',port:3000,path,method,headers};
    const r=http.request(opts,(res)=>{
      let body='';
      res.on('data',c=>body+=c);
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
    });
    r.on('error',reject);
    if(data) r.write(data);
    r.end();
  });
}

(async()=>{
  try{
    console.log('GET /products');
    const p=await req('/products');
    console.log(p.status,p.body);

    console.log('GET /api/me');
    const m=await req('/api/me');
    console.log(m.status,m.body);
  }catch(e){
    console.error('ERR',e.message);
  }
})();
