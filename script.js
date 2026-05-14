window.onerror=function(msg,s,l){document.body.innerHTML='<div style="background:red;color:white;padding:20px"><h2>Erreur</h2><p>'+msg+'</p><p>Ligne: '+l+'</p></div>'+document.body.innerHTML;};
window.onunhandledrejection=function(e){console.error('Unhandled:',e.reason);};

document.addEventListener("DOMContentLoaded",async function(){
  try{await initFirebaseDB();await refreshInterface();}
  catch(e){alert('Erreur Firebase: '+e.message);console.error(e);}
  finally{var loader=document.getElementById('app-loader');if(loader)loader.classList.add('hidden');}
});

// ===== HIDE LOADER =====
function hideLoader(){var l=document.getElementById('app-loader');if(l)l.classList.add('hidden');}

// ===== VIEW MANAGEMENT =====
function hideAllViews(){
  var ids=['view-auth','view-payment','view-platform'];
  for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]);if(el)el.classList.add('hidden');}
}
function hideAllPages(){
  var pages=document.querySelectorAll('.view-page');
  pages.forEach(function(p){p.classList.add('hidden');});
}
window.goToView=function(name){
  hideAllPages();
  var el=document.getElementById('v-'+name);
  if(el)el.classList.remove('hidden');
  // Update nav active states
  document.querySelectorAll('.nav-icon-btn').forEach(function(b){b.classList.remove('active');});
  var ab=document.querySelector('.nav-icon-btn[data-view="'+name+'"]');if(ab)ab.classList.add('active');
  document.querySelectorAll('.bottom-nav button').forEach(function(b){b.classList.remove('active');});
  var bb=document.querySelector('.bottom-nav button[data-view="'+name+'"]');if(bb)bb.classList.add('active');
  // Close menus
  closeDD();closeMM();
  window.scrollTo({top:0,behavior:'smooth'});
  // Load data
  if(name==='home')loadHomeData();
  if(name==='categories')loadCategories();
  if(name==='teachers')loadTeachersView();
  if(name==='messages')loadMessages();
  if(name==='notifications')loadNotifications();
  if(name==='profile')loadProfile();
  if(name==='admin')loadAdminData();
};

// ===== REFRESH INTERFACE =====
window.refreshInterface=async function(){
  hideAllViews();var user=getSession();
  if(!user){document.getElementById('view-auth').classList.remove('hidden');switchAuth('login');hideLoader();return;}
  var fresh=await fbGetUser(user.id);if(fresh){user=fresh;setSession(user);}
  if(user.needsPasswordChange){document.getElementById('view-auth').classList.remove('hidden');switchAuth('force-pass');hideLoader();return;}
  if(user.role==='admin'||user.activeRole==='admin'){
    document.getElementById('view-platform').classList.remove('hidden');
    setupNav(user);goToView('admin');hideLoader();return;
  }
  if(user.role==='enseignant'||user.activeRole==='enseignant'){
    if(user.paymentDate){var d=Math.floor((new Date()-new Date(user.paymentDate))/(864e5));if(d>=30&&user.paymentStatus!=='awaiting'){user.paymentStatus='expired';await fbSetUser(user.id,{paymentStatus:'expired'});setSession(user);}}
    if(user.status==='pending'||user.paymentStatus==='expired'){document.getElementById('view-payment').classList.remove('hidden');showPayScreen(user);hideLoader();return;}
    if(user.paymentStatus==='awaiting'){document.getElementById('view-payment').classList.remove('hidden');showWaitingScreen();hideLoader();return;}
  }
  if(user.status==='blocked'){alert('Votre compte a été bloqué.');appLogout();return;}
  document.getElementById('view-platform').classList.remove('hidden');
  setupNav(user);goToView('home');hideLoader();
};

// ===== NAV SETUP =====
function setupNav(user){
  var av=user.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(user.name||'U')+'&background=0d6e4e&color=fff&size=40';
  var navAv=document.getElementById('nav-avatar');if(navAv)navAv.src=av;
  var ddAv=document.getElementById('dd-avatar');if(ddAv)ddAv.src=av;
  var ddN=document.getElementById('dd-name');if(ddN)ddN.textContent=user.name||'';
  var ddR=document.getElementById('dd-role');if(ddR)ddR.textContent=user.activeRole||user.role||'';
  var ddAdmin=document.getElementById('dd-admin-link');
  if(ddAdmin){if(user.role==='admin')ddAdmin.classList.remove('hidden');else ddAdmin.classList.add('hidden');}
  var ddSwitch=document.getElementById('dd-switch-role');
  if(ddSwitch){
    if(user.roles&&user.roles.length>1)ddSwitch.classList.remove('hidden');
    else ddSwitch.classList.add('hidden');
  }
  var switchLabel=document.getElementById('dd-switch-label');
  if(switchLabel){
    var ar=user.activeRole||user.role;
    switchLabel.textContent=ar==='enseignant'?'Passer Apprenant':'Passer Enseignant';
  }
}
window.toggleProfileMenu=function(){var d=document.getElementById('profile-dropdown');if(d)d.classList.toggle('hidden');};
window.closeDD=function(){var d=document.getElementById('profile-dropdown');if(d)d.classList.add('hidden');};
window.toggleMobileMenu=function(){var m=document.getElementById('mobile-menu');if(m)m.classList.toggle('hidden');};
window.closeMM=function(){var m=document.getElementById('mobile-menu');if(m)m.classList.add('hidden');};
window.toggleRole=async function(){
  var u=getSession();if(!u||!u.roles||u.roles.length<2)return;
  var ar=u.activeRole||u.role;
  u.activeRole=ar==='enseignant'?'apprenant':'enseignant';
  await fbSetUser(u.id,{activeRole:u.activeRole});setSession(u);await refreshInterface();
};

// ===== AUTH =====
window.switchAuth=function(id){
  var s=['login','register','forgot','force-pass'];
  for(var i=0;i<s.length;i++){var el=document.getElementById('auth-'+s[i]);if(el)el.classList.add('hidden');}
  var show=document.getElementById('auth-'+id);if(show)show.classList.remove('hidden');
};
window.selectRole=function(r){
  document.querySelectorAll('.role-opt').forEach(function(b){b.classList.remove('active');});
  var btn=document.querySelector('.role-opt[data-role="'+r+'"]');if(btn)btn.classList.add('active');
  document.getElementById('reg-role').value=r;
  var opts=document.getElementById('reg-teacher-opts');
  if(opts){if(r==='enseignant'||r==='both')opts.classList.remove('hidden');else opts.classList.add('hidden');}
};
window.appRegister=async function(){
  var role=document.getElementById('reg-role').value;
  var name=document.getElementById('reg-name').value.trim();
  var phone=document.getElementById('reg-phone').value.trim();
  var city=document.getElementById('reg-city').value.trim();
  var pass=document.getElementById('reg-pass').value;
  if(!name||!phone||!city||!pass){alert("Remplissez tous les champs.");return;}
  var categories=[],disciplines=[],pubs=[];
  if(role==='enseignant'||role==='both'){
    document.querySelectorAll('#reg-categories-grid .chip-check input:checked').forEach(function(c){categories.push(c.value);});
    document.querySelectorAll('#reg-disciplines-grid .chip-check input:checked').forEach(function(c){disciplines.push(c.value);});
    document.querySelectorAll('.reg-public:checked').forEach(function(c){pubs.push(c.value);});
  }
  var ex=await fbFindByPhone(phone);if(ex){alert("Numéro déjà inscrit.");return;}
  var roles=[];
  if(role==='both'){roles=['apprenant','enseignant'];}
  else{roles=[role];}
  var u={id:'u_'+Date.now(),role:role==='both'?'enseignant':role,roles:roles,activeRole:role==='both'?'apprenant':role,
    name:name,phone:phone,city:city,password:pass,
    status:(role==='enseignant'||role==='both'?'pending':'active'),
    categories:categories,disciplines:disciplines,publics:pubs,
    bio:'',avatar:'',paymentStatus:'',paymentDate:'',
    followers:[],following:[],isOnline:false,lastSeen:'',createdAt:new Date().toISOString()};
  await fbSetUser(u.id,u);setSession(u);await refreshInterface();
};
window.appLogin=async function(){
  var id=document.getElementById('login-id').value.trim();
  var pass=document.getElementById('login-pass').value;
  if(!id||!pass){alert("Remplissez vos identifiants.");return;}
  var found=await fbFindByLogin(id,pass);
  if(found){if(found.status==='blocked'){alert("Compte bloqué.");return;}setSession(found);await refreshInterface();}
  else{alert("Identifiants incorrects.");}
};
window.appForgotPass=async function(){
  var phone=document.getElementById('forgot-phone').value.trim();
  var u=await fbFindByPhone(phone);
  if(u){alert("Mot de passe réinitialisé à '1234'.");await fbSetUser(u.id,{password:'1234',needsPasswordChange:true});switchAuth('login');}
  else{alert("Numéro introuvable.");}
};
window.appForcePassChange=async function(){
  var np=document.getElementById('force-new-pass').value;
  if(np.length<4){alert("Trop court (4 caractères min).");return;}
  var cu=getSession();await fbSetUser(cu.id,{password:np,needsPasswordChange:false});
  cu.password=np;cu.needsPasswordChange=false;setSession(cu);await refreshInterface();
};
window.appLogout=function(){clearSession();location.reload();};

// ===== PAYMENT =====
function showPayScreen(u){
  var sp=document.getElementById('pay-screen-pay'),sw=document.getElementById('pay-screen-waiting');
  if(sp)sp.classList.remove('hidden');if(sw)sw.classList.add('hidden');
}
function showWaitingScreen(){
  var sp=document.getElementById('pay-screen-pay'),sw=document.getElementById('pay-screen-waiting');
  if(sp)sp.classList.add('hidden');if(sw)sw.classList.remove('hidden');
}
window.confirmPayment=async function(){
  var u=getSession();if(!u)return;
  u.paymentStatus='awaiting';await fbSetUser(u.id,{paymentStatus:'awaiting'});setSession(u);
  showWaitingScreen();
};

// ===== HOME =====
async function loadHomeData(){
  var u=getSession();
  var hw=document.getElementById('hero-welcome');
  if(hw&&u)hw.innerHTML='Bienvenue <span class="gradient-text">'+u.name+'</span>';
  // Categories
  var cg=document.getElementById('home-categories');
  if(cg){cg.innerHTML='';var keys=Object.keys(CATEGORIES);
    for(var i=0;i<Math.min(keys.length,8);i++){var k=keys[i];var c=CATEGORIES[k];
      cg.innerHTML+='<div class="cat-card" onclick="goToView(\'categories\')"><i class="fa-solid '+c.icon+'" style="color:'+c.color+'"></i><h3>'+k+'</h3><span>'+c.disciplines.length+' disciplines</span></div>';
    }
  }
  // Teachers preview
  var tg=document.getElementById('home-teachers');
  if(tg){tg.innerHTML='<p class="text-muted text-center" style="grid-column:1/-1">Chargement...</p>';
    var users=await fbGetAllUsers();tg.innerHTML='';var count=0;
    for(var i=0;i<users.length&&count<6;i++){
      var t=users[i];if((t.role!=='enseignant'&&t.activeRole!=='enseignant')||t.status!=='active')continue;count++;
      var av=t.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background=0d6e4e&color=fff&size=150';
      var badges='';if(t.categories)for(var j=0;j<t.categories.length;j++)badges+='<span class="badge">'+t.categories[j]+'</span>';
      if(t.disciplines)for(var j=0;j<Math.min(t.disciplines.length,2);j++)badges+='<span class="badge">'+t.disciplines[j]+'</span>';
      tg.innerHTML+='<div class="teacher-card" onclick="openTeacherModal(\''+t.id+'\')"><div class="teacher-avatar"><img src="'+av+'"></div><div class="teacher-info"><h3>'+t.name+'</h3><p class="text-sm"><i class="fa-solid fa-location-dot"></i> '+(t.city||'')+'</p><div class="specs-badges">'+badges+'</div></div></div>';
    }
    if(count===0)tg.innerHTML='<p class="text-muted text-center" style="grid-column:1/-1">Aucun enseignant disponible pour le moment.</p>';
  }
  // Stats
  var hs=document.getElementById('hero-stats');
  if(hs){var users=await fbGetAllUsers();var tc=0,sc=0;
    for(var i=0;i<users.length;i++){if(users[i].role==='enseignant')tc++;else if(users[i].role!=='admin')sc++;}
    hs.innerHTML='<div><strong>'+tc+'</strong><span>Enseignants</span></div><div><strong>'+sc+'</strong><span>Apprenants</span></div><div><strong>'+Object.keys(CATEGORIES).length+'</strong><span>Catégories</span></div>';
  }
}

// ===== CATEGORIES =====
function loadCategories(){
  var cg=document.getElementById('categories-full');if(!cg)return;cg.innerHTML='';
  var keys=Object.keys(CATEGORIES);
  for(var i=0;i<keys.length;i++){var k=keys[i];var c=CATEGORIES[k];
    cg.innerHTML+='<div class="cat-card" onclick="filterByCategory(\''+k+'\')"><i class="fa-solid '+c.icon+'" style="color:'+c.color+'"></i><h3>'+k+'</h3><span>'+c.disciplines.length+' disciplines</span></div>';
  }
}
window.filterByCategory=function(cat){
  goToView('teachers');
  setTimeout(function(){var sel=document.getElementById('t-category');if(sel){sel.value=cat;renderTeachers();}},100);
};

// ===== TEACHERS =====
async function loadTeachersView(){
  // Populate category filter
  var sel=document.getElementById('t-category');
  if(sel&&sel.options.length<=1){
    var keys=Object.keys(CATEGORIES);
    for(var i=0;i<keys.length;i++){var o=document.createElement('option');o.value=keys[i];o.textContent=keys[i];sel.appendChild(o);}
  }
  await renderTeachers();
}
window.updateDisciplineFilter=function(){
  var cat=document.getElementById('t-category').value;
  var dSel=document.getElementById('t-discipline');
  if(!dSel)return;dSel.innerHTML='<option value="">Toutes disciplines</option>';
  if(cat&&CATEGORIES[cat]){
    for(var i=0;i<CATEGORIES[cat].disciplines.length;i++){
      var o=document.createElement('option');o.value=CATEGORIES[cat].disciplines[i];o.textContent=CATEGORIES[cat].disciplines[i];dSel.appendChild(o);
    }
  }
};
window.renderTeachers=async function(){
  var container=document.getElementById('teachers-list');if(!container)return;
  container.innerHTML='<p class="text-muted text-center" style="grid-column:1/-1">Chargement...</p>';
  var search=(document.getElementById('t-search')||{}).value||'';search=search.toLowerCase();
  var cat=(document.getElementById('t-category')||{}).value||'';
  var disc=(document.getElementById('t-discipline')||{}).value||'';
  var pub=(document.getElementById('t-public')||{}).value||'';
  var users=await fbGetAllUsers();var cu=getSession();container.innerHTML='';var count=0;
  for(var i=0;i<users.length;i++){var t=users[i];
    if(t.role!=='enseignant'||t.status!=='active')continue;
    if(search&&t.name.toLowerCase().indexOf(search)===-1&&(!t.city||t.city.toLowerCase().indexOf(search)===-1))continue;
    if(cat&&(!t.categories||t.categories.indexOf(cat)===-1))continue;
    if(disc&&(!t.disciplines||t.disciplines.indexOf(disc)===-1))continue;
    if(pub&&(!t.publics||t.publics.indexOf(pub)===-1))continue;
    count++;
    var av=t.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background=0d6e4e&color=fff&size=150';
    var badges='';
    if(t.categories)for(var j=0;j<t.categories.length;j++)badges+='<span class="badge">'+t.categories[j]+'</span>';
    if(t.disciplines)for(var j=0;j<t.disciplines.length;j++)badges+='<span class="badge">'+t.disciplines[j]+'</span>';
    var pubBadges='';if(t.publics)for(var j=0;j<t.publics.length;j++)pubBadges+='<span class="public-badge">'+t.publics[j]+'</span>';
    var bio=t.bio?'<p class="teacher-bio">"'+t.bio.substring(0,80)+(t.bio.length>80?'...':'')+'"</p>':'';
    container.innerHTML+='<div class="teacher-card"><div class="teacher-avatar"><img src="'+av+'"></div><div class="teacher-info"><h3>'+t.name+'</h3><p class="text-sm"><i class="fa-solid fa-location-dot"></i> '+(t.city||'')+'</p><div class="specs-badges">'+badges+'</div><div class="specs-badges">'+pubBadges+'</div>'+bio+'<button class="btn-main w-full" style="margin-top:8px" onclick="openTeacherModal(\''+t.id+'\')"><i class="fa-solid fa-eye"></i> Voir profil</button><button class="btn-outline-main w-full" style="margin-top:6px" onclick="startConversation(\''+t.id+'\')"><i class="fa-solid fa-comment-dots"></i> Message</button></div></div>';
  }
  if(count===0)container.innerHTML='<p class="text-muted text-center" style="grid-column:1/-1">Aucun enseignant trouvé.</p>';
};
window.handleGlobalSearch=function(e){
  if(e.key==='Enter'){var v=document.getElementById('global-search').value;
    goToView('teachers');setTimeout(function(){var s=document.getElementById('t-search');if(s){s.value=v;renderTeachers();}},100);
  }
};

// ===== TEACHER MODAL =====
window.openTeacherModal=async function(tid){
  var t=await fbGetUser(tid);if(!t)return;var cu=getSession();
  var av=t.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background=0d6e4e&color=fff&size=200';
  var badges='';if(t.categories)for(var j=0;j<t.categories.length;j++)badges+='<span class="badge">'+t.categories[j]+'</span> ';
  if(t.disciplines)for(var j=0;j<t.disciplines.length;j++)badges+='<span class="badge">'+t.disciplines[j]+'</span> ';
  var pubH='';if(t.publics)for(var j=0;j<t.publics.length;j++)pubH+='<span class="public-badge">'+t.publics[j]+'</span> ';
  var body=document.getElementById('teacher-modal-body');
  body.innerHTML='<button class="modal-close" onclick="closeModal(\'teacher-modal\')">&times;</button>'
    +'<div class="text-center"><img src="'+av+'" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid var(--turquoise);margin-bottom:16px;"></div>'
    +'<h2 class="text-center" style="margin-bottom:4px;">'+t.name+'</h2>'
    +'<p class="text-center text-sm mb-2"><i class="fa-solid fa-location-dot"></i> '+(t.city||'')+'</p>'
    +'<div class="text-center mb-2">'+badges+'</div>'
    +(pubH?'<div class="text-center mb-2">'+pubH+'</div>':'')
    +(t.bio?'<div style="background:var(--bg);padding:16px;border-radius:var(--radius);margin:16px 0;"><p style="white-space:pre-wrap;">'+t.bio+'</p></div>':'')
    +'<button class="btn-main w-full mt-2" onclick="startConversation(\''+t.id+'\');closeModal(\'teacher-modal\')"><i class="fa-solid fa-comment-dots"></i> Envoyer un message</button>';
  document.getElementById('teacher-modal').classList.remove('hidden');
};
window.closeModal=function(id){document.getElementById(id).classList.add('hidden');};

// ===== MESSAGES =====
var currentConvId=null,msgListener=null,convListener=null;
async function loadMessages(){
  var cu=getSession();if(!cu)return;
  if(convListener)convListener();
  convListener=fbListenConversations(cu.id,function(convs){renderConvList(convs);});
}
async function renderConvList(convs){
  var cl=document.getElementById('conv-list');if(!cl)return;
  var cu=getSession();if(!cu)return;
  if(convs.length===0){cl.innerHTML='<p class="empty-msg">Aucune conversation</p>';return;}
  cl.innerHTML='';
  for(var i=0;i<convs.length;i++){
    var c=convs[i];var otherId=c.participants[0]===cu.id?c.participants[1]:c.participants[0];
    var other=await fbGetUser(otherId);if(!other)continue;
    var av=other.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(other.name)+'&background=0d6e4e&color=fff&size=44';
    var unread=c.unread&&c.unread[cu.id]?c.unread[cu.id]:0;
    var lastMsg=c.lastMessage?c.lastMessage.text||'':'Nouvelle conversation';
    var div=document.createElement('div');div.className='conv-item'+(currentConvId===c.id?' active':'');
    div.setAttribute('data-conv-id',c.id);
    div.innerHTML='<img src="'+av+'"><div class="conv-item-info"><strong>'+other.name+'</strong><p>'+lastMsg.substring(0,40)+'</p></div>'+(unread>0?'<div class="conv-unread">'+unread+'</div>':'');
    div.onclick=(function(convId,otherUser){return function(){openConversation(convId,otherUser);};})(c.id,other);
    cl.appendChild(div);
  }
}
async function openConversation(convId,otherUser){
  currentConvId=convId;var cu=getSession();
  var ca=document.getElementById('chat-area');if(!ca)return;
  var av=otherUser.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(otherUser.name)+'&background=0d6e4e&color=fff&size=40';
  ca.innerHTML='<div class="chat-header"><img src="'+av+'"><div><strong>'+otherUser.name+'</strong><br><small>'+(otherUser.city||'')+'</small></div></div><div class="chat-messages" id="chat-messages"></div><div class="chat-input"><input type="text" id="msg-input" placeholder="Votre message..." onkeyup="if(event.key===\'Enter\')sendMessage()"><button onclick="sendMessage()"><i class="fa-solid fa-paper-plane"></i></button></div>';
  await fbMarkAsRead(convId,cu.id);
  if(msgListener)msgListener();
  msgListener=fbListenMessages(convId,function(msgs){
    var mc=document.getElementById('chat-messages');if(!mc)return;mc.innerHTML='';
    for(var i=0;i<msgs.length;i++){var m=msgs[i];
      var cls=m.senderId===cu.id?'sent':'received';
      mc.innerHTML+='<div class="msg-bubble '+cls+'">'+m.text+'<span class="msg-time">'+new Date(m.timestamp).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})+'</span></div>';
    }
    mc.scrollTop=mc.scrollHeight;
  });
  // Update sidebar active
  document.querySelectorAll('.conv-item').forEach(function(c){c.classList.remove('active');});
  var ac=document.querySelector('.conv-item[data-conv-id="'+convId+'"]');if(ac)ac.classList.add('active');
}
window.sendMessage=async function(){
  var input=document.getElementById('msg-input');if(!input||!input.value.trim())return;
  var cu=getSession();if(!cu||!currentConvId)return;
  var conv=null;
  try{var doc=await db.collection('conversations').doc(currentConvId).get();if(doc.exists)conv=doc.data();}catch(e){}
  if(!conv)return;
  var recipientId=conv.participants[0]===cu.id?conv.participants[1]:conv.participants[0];
  await fbSendMessage(currentConvId,{text:input.value.trim(),senderId:cu.id,recipientId:recipientId,timestamp:new Date().toISOString(),type:'text'});
  input.value='';
};
window.startConversation=async function(otherId){
  var cu=getSession();if(!cu)return;
  var conv=await fbGetOrCreateConversation(cu.id,otherId);
  var other=await fbGetUser(otherId);if(!other)return;
  goToView('messages');
  setTimeout(function(){openConversation(conv.id,other);},300);
};
window.filterConversations=function(){
  var q=(document.getElementById('conv-search-input')||{}).value||'';q=q.toLowerCase();
  document.querySelectorAll('.conv-item').forEach(function(c){
    var name=c.querySelector('strong');
    if(name&&name.textContent.toLowerCase().indexOf(q)!==-1)c.style.display='';else c.style.display='none';
  });
};

// ===== PROFILE =====
async function loadProfile(){
  var cu=getSession();if(!cu)return;
  var av=cu.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(cu.name)+'&background=0d6e4e&color=fff&size=100';
  var pa=document.getElementById('prof-avatar');if(pa)pa.src=av;
  var pn=document.getElementById('prof-name');if(pn)pn.textContent=cu.name;
  var pr=document.getElementById('prof-role-badge');if(pr)pr.textContent=cu.activeRole||cu.role;
  var pni=document.getElementById('prof-name-input');if(pni)pni.value=cu.name||'';
  var pci=document.getElementById('prof-city-input');if(pci)pci.value=cu.city||'';
  var pfl=document.getElementById('prof-followers');if(pfl)pfl.textContent=(cu.followers||[]).length;
  var pfg=document.getElementById('prof-following');if(pfg)pfg.textContent=(cu.following||[]).length;
  // Teacher section
  var ts=document.getElementById('prof-teacher-section');
  if(ts){
    if(cu.role==='enseignant'||cu.activeRole==='enseignant'||(cu.roles&&cu.roles.indexOf('enseignant')!==-1)){
      ts.classList.remove('hidden');
      var bio=document.getElementById('prof-bio');if(bio)bio.value=cu.bio||'';
      // Render chips
      renderChips('prof-categories-grid',Object.keys(CATEGORIES),cu.categories||[],'prof-cat');
      var allDisc=[];Object.keys(CATEGORIES).forEach(function(k){CATEGORIES[k].disciplines.forEach(function(d){if(allDisc.indexOf(d)===-1)allDisc.push(d);});});
      renderChips('prof-disciplines-grid',allDisc,cu.disciplines||[],'prof-disc');
      renderChips('prof-publics-grid',['Enfants','Adultes','Femmes','Hommes'],cu.publics||[],'prof-pub');
    }else{ts.classList.add('hidden');}
  }
  // Roles manager
  var rm=document.getElementById('roles-manager');
  if(rm){rm.innerHTML='';
    var allRoles=cu.roles||[cu.role];
    allRoles.forEach(function(r){
      rm.innerHTML+='<div class="role-card'+(r===(cu.activeRole||cu.role)?' active':'')+'">'+r+'</div>';
    });
  }
}
function renderChips(containerId,options,selected,prefix){
  var c=document.getElementById(containerId);if(!c)return;c.innerHTML='';
  for(var i=0;i<options.length;i++){
    var checked=selected.indexOf(options[i])!==-1?'checked':'';
    c.innerHTML+='<label class="chip-check"><input type="checkbox" class="'+prefix+'" value="'+options[i]+'" '+checked+'> '+options[i]+'</label>';
  }
}
// Init registration chips
function initRegChips(){
  var cg=document.getElementById('reg-categories-grid');
  if(cg&&cg.children.length===0){
    Object.keys(CATEGORIES).forEach(function(k){
      cg.innerHTML+='<label class="chip-check"><input type="checkbox" value="'+k+'"> '+k+'</label>';
    });
  }
  var dg=document.getElementById('reg-disciplines-grid');
  if(dg&&dg.children.length===0){
    var allDisc=[];Object.keys(CATEGORIES).forEach(function(k){CATEGORIES[k].disciplines.forEach(function(d){if(allDisc.indexOf(d)===-1)allDisc.push(d);});});
    allDisc.forEach(function(d){dg.innerHTML+='<label class="chip-check"><input type="checkbox" value="'+d+'"> '+d+'</label>';});
  }
}
setTimeout(initRegChips,500);

window.saveProfile=async function(){
  var cu=getSession();if(!cu)return;
  var data={};
  data.name=(document.getElementById('prof-name-input')||{}).value||cu.name;
  data.city=(document.getElementById('prof-city-input')||{}).value||cu.city;
  if(cu.role==='enseignant'||(cu.roles&&cu.roles.indexOf('enseignant')!==-1)){
    data.bio=(document.getElementById('prof-bio')||{}).value||'';
    data.categories=[];document.querySelectorAll('.prof-cat:checked').forEach(function(c){data.categories.push(c.value);});
    data.disciplines=[];document.querySelectorAll('.prof-disc:checked').forEach(function(c){data.disciplines.push(c.value);});
    data.publics=[];document.querySelectorAll('.prof-pub:checked').forEach(function(c){data.publics.push(c.value);});
  }
  await fbSetUser(cu.id,data);Object.assign(cu,data);setSession(cu);
  alert("Profil enregistré !");setupNav(cu);loadProfile();
};
window.uploadAvatar=async function(input){
  if(!input.files||!input.files[0])return;var cu=getSession();if(!cu)return;
  var file=input.files[0];
  var reader=new FileReader();
  reader.onload=async function(e){
    var data={avatar:e.target.result};
    await fbSetUser(cu.id,data);cu.avatar=data.avatar;setSession(cu);
    setupNav(cu);loadProfile();
  };
  reader.readAsDataURL(file);
};
window.uploadGalleryMedia=async function(){
  var fi=document.getElementById('gallery-upload');if(!fi||!fi.files||!fi.files[0])return;
  var cu=getSession();var file=fi.files[0];
  var mid='m_'+Date.now();var url=await fbUploadFile(mid,file);
  await fbAddMedia(mid,{id:mid,userId:cu.id,type:file.type,url:url});
  fi.value='';loadProfile();
};

// ===== NOTIFICATIONS =====
async function loadNotifications(){
  var cu=getSession();if(!cu)return;
  var nl=document.getElementById('notifications-list');if(!nl)return;
  nl.innerHTML='<p class="empty-msg">Chargement...</p>';
  var notifs=await fbGetNotifications(cu.id);
  if(notifs.length===0){nl.innerHTML='<p class="empty-msg">Aucune notification</p>';return;}
  nl.innerHTML='';
  for(var i=0;i<notifs.length;i++){var n=notifs[i];
    nl.innerHTML+='<div class="notif-item'+(n.read?'':' unread')+'"><div class="notif-icon"><i class="fa-solid '+(n.icon||'fa-bell')+'"></i></div><div class="notif-content"><p>'+n.text+'</p><small>'+new Date(n.timestamp).toLocaleDateString('fr')+'</small></div></div>';
  }
}

// ===== STORIES (basic) =====
window.openStoryCreator=function(){document.getElementById('story-creator').classList.remove('hidden');initStoryCreator();};
function initStoryCreator(){
  var colors=['#0d6e4e','#1abc9c','#d4a017','#e63946','#6366f1','#ec4899','#000'];
  var cp=document.getElementById('sc-colors');if(cp){cp.innerHTML='';
    colors.forEach(function(c,i){cp.innerHTML+='<div style="background:'+c+'"'+(i===0?' class="active"':'')+' onclick="pickStoryColor(this,\''+c+'\')"></div>';});
  }
  window._storyColor=colors[0];window._storyType='text';
}
window.pickStoryColor=function(el,color){
  window._storyColor=color;
  document.querySelectorAll('#sc-colors div').forEach(function(d){d.classList.remove('active');});
  el.classList.add('active');
};
window.setStoryType=function(type){
  window._storyType=type;
  document.querySelectorAll('.story-type-tabs button').forEach(function(b){b.classList.remove('active');});
  event.target.closest('button').classList.add('active');
  var ta=document.getElementById('sc-text-area'),ma=document.getElementById('sc-media-area');
  if(type==='text'){if(ta)ta.classList.remove('hidden');if(ma)ma.classList.add('hidden');}
  else{if(ta)ta.classList.add('hidden');if(ma)ma.classList.remove('hidden');}
};
window.publishStory=async function(){
  var cu=getSession();if(!cu)return;
  var data={userId:cu.id,userName:cu.name,userAvatar:cu.avatar||'',type:window._storyType||'text',
    createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),views:[],replies:[]};
  if(data.type==='text'){
    data.text=(document.getElementById('sc-text')||{}).value||'';
    data.bgColor=window._storyColor||'#0d6e4e';
    if(!data.text){alert('Écrivez quelque chose.');return;}
  }else{
    var fi=document.getElementById('sc-file');
    if(!fi||!fi.files||!fi.files[0]){alert('Choisissez un fichier.');return;}
    var mid='story_'+Date.now();data.mediaUrl=await fbUploadFile(mid,fi.files[0]);data.mediaType=fi.files[0].type;
  }
  await fbCreateStory(data);closeModal('story-creator');
  alert('Story publiée !');
};
window.closeStoryViewer=function(){document.getElementById('story-viewer').classList.add('hidden');};
window.handleStoryClick=function(e){};
window.sendStoryReply=function(){};

// ===== ADMIN =====
window.loadAdminData=async function(){
  var users=await fbGetAllUsers();
  // Stats
  var as=document.getElementById('admin-stats');
  if(as){var tc=0,sc=0,pc=0;
    for(var i=0;i<users.length;i++){if(users[i].role==='enseignant')tc++;else if(users[i].role!=='admin')sc++;if(users[i].paymentStatus==='awaiting')pc++;}
    as.innerHTML='<div class="stat-card"><i class="fa-solid fa-users"></i><div><span class="stat-num">'+(tc+sc)+'</span><span class="stat-label">Total</span></div></div><div class="stat-card"><i class="fa-solid fa-chalkboard-user"></i><div><span class="stat-num">'+tc+'</span><span class="stat-label">Enseignants</span></div></div><div class="stat-card"><i class="fa-solid fa-user-graduate"></i><div><span class="stat-num">'+sc+'</span><span class="stat-label">Apprenants</span></div></div><div class="stat-card"><i class="fa-solid fa-wallet"></i><div><span class="stat-num">'+pc+'</span><span class="stat-label">Paiements en attente</span></div></div>';
  }
  // Table
  var tb=document.getElementById('admin-tbody');if(!tb)return;tb.innerHTML='';
  for(var i=0;i<users.length;i++){var u=users[i];if(u.role==='admin')continue;
    var sb='';if(u.status==='active')sb='<span class="status-badge status-active">Actif</span>';
    else if(u.status==='pending')sb='<span class="status-badge status-pending">En attente</span>';
    else sb='<span class="status-badge status-blocked">Bloqué</span>';
    var pay='—';
    if(u.role==='enseignant'){
      if(u.paymentStatus==='awaiting')pay='<span class="status-badge status-pending">💰 Signalé</span>';
      else if(u.paymentStatus==='expired')pay='<span class="status-badge status-blocked">Expiré</span>';
      else if(u.paymentDate)pay='<span class="status-badge status-active">✅ Payé</span>';
      else pay='<span class="status-badge status-pending">Non payé</span>';
    }
    var btns='';
    if(u.paymentStatus==='awaiting')btns+='<button class="btn-success" style="margin:2px;" onclick="adminValidatePayment(\''+u.id+'\')">✅ Valider</button>';
    if(u.status!=='active')btns+='<button class="btn-success" style="margin:2px;" onclick="adminSetStatus(\''+u.id+'\',\'active\')">Activer</button>';
    if(u.status!=='blocked')btns+='<button class="btn-danger" style="margin:2px;" onclick="adminSetStatus(\''+u.id+'\',\'blocked\')">Bloquer</button>';
    btns+='<button class="btn-danger" style="margin:2px;opacity:.7;" onclick="adminDeleteUser(\''+u.id+'\')"><i class="fa-solid fa-trash"></i></button>';
    tb.innerHTML+='<tr><td>'+u.name+'</td><td>'+(u.role||'').toUpperCase()+'</td><td>'+u.phone+'</td><td>'+(u.city||'')+'</td><td>'+sb+'</td><td>'+pay+'</td><td>'+btns+'</td></tr>';
  }
};
window.adminSetStatus=async function(uid,s){await fbSetUser(uid,{status:s});await loadAdminData();};
window.adminValidatePayment=async function(uid){await fbSetUser(uid,{paymentStatus:'paid',paymentDate:new Date().toISOString(),status:'active'});alert('Paiement validé !');await loadAdminData();};
window.adminDeleteUser=async function(uid){if(!confirm('Supprimer ce compte ?'))return;await fbDeleteUser(uid);alert('Supprimé.');await loadAdminData();};

// Close dropdowns on outside click
document.addEventListener('click',function(e){
  if(!e.target.closest('.nav-profile-wrap'))closeDD();
});

