// Set a known display baseline without relying on cleanup from an earlier test.
async function resetDisplay(request){
 const current=await request.get('/api/state'),state=await current.json();
 const response=await request.post('/api/preferences',{headers:{Origin:new URL(current.url()).origin,'X-Sizzla-Token':state.token},data:{language:'sv',theme:'light',textSize:100,bold:false}});
 if(!response.ok())throw Error('Cannot reset test display: '+await response.text());
}
module.exports={resetDisplay};
