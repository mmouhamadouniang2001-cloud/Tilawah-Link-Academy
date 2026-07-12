window.onerror=function(msg,s,l){console.error('Error:',msg,'Line:',l);};
window.onunhandledrejection=function(e){console.error('Unhandled:',e.reason);};
function sanitize(str){if(!str)return '';var d=document.createElement('div');d.textContent=str;return d.innerHTML;}

document.addEventListener("DOMContentLoaded",async function(){
  try{
    if(localStorage.getItem('tla_dark')==='true')document.body.classList.add('dark');
    // Attendre que Firebase Auth soit prêt avant toute opération
    await fbAuthReady();
    await initFirebaseDB();await refreshInterface();
  }catch(e){alert('Erreur Firebase: '+e.message);console.error(e);}
  finally{hideLoader();}
});
function hideLoader(){var l=document.getElementById('app-loader');if(l)l.classList.add('hidden');}

// ===== DARK MODE =====
window.toggleDarkMode=function(){
  document.body.classList.toggle('dark');
  localStorage.setItem('tla_dark',document.body.classList.contains('dark'));
};

// ===== VIEWS =====
function hideAllViews(){['view-auth','view-platform'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('hidden');});}
function hideAllPages(){document.querySelectorAll('.view-page').forEach(function(p){p.classList.add('hidden');});}
window.goToView=function(name){
  hideAllPages();var el=document.getElementById('v-'+name);if(el)el.classList.remove('hidden');
  document.querySelectorAll('.nav-icon-btn').forEach(function(b){b.classList.remove('active');});
  var ab=document.querySelector('.nav-icon-btn[data-view="'+name+'"]');if(ab)ab.classList.add('active');
  document.querySelectorAll('.bottom-nav button').forEach(function(b){b.classList.remove('active');});
  var bb=document.querySelector('.bottom-nav button[data-view="'+name+'"]');if(bb)bb.classList.add('active');
  closeDD();closeMM();window.scrollTo({top:0,behavior:'smooth'});
  if(name==='home')loadHomeData();
  if(name==='feed')loadFeed();
  if(name==='categories')loadCategories();
  if(name==='teachers')loadTeachersView();
  if(name==='stories')loadStoriesView();
  if(name==='messages')loadMessages();
  if(name==='notifications')loadNotifications();
  if(name==='profile')loadProfile();
  if(name==='favorites')loadFavorites();
  if(name==='admin')loadAdminData();
};

// ===== REFRESH =====
window.refreshInterface=async function(){
  hideAllViews();var user=getSession();
  if(!user){document.getElementById('view-auth').classList.remove('hidden');switchAuth('login');hideLoader();return;}
  // S'assurer que Firebase Auth est actif
  await fbAuthSignIn();
  var fresh=await fbGetUser(user.id);if(fresh){user=fresh;setSession(user);}
  if(user.needsPasswordChange){document.getElementById('view-auth').classList.remove('hidden');switchAuth('force-pass');hideLoader();return;}
  if(user.role==='admin'||user.activeRole==='admin'){
    document.getElementById('view-platform').classList.remove('hidden');setupNav(user);goToView('admin');startUnreadBadgeListener();hideLoader();return;
  }

  if(user.status==='blocked'){alert('Compte bloqué.');appLogout();return;}
  document.getElementById('view-platform').classList.remove('hidden');setupNav(user);goToView('home');startUnreadBadgeListener();hideLoader();
};

// ===== NAV =====
function setupNav(user){
  var av=user.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(user.name||'U')+'&background=0d6e4e&color=fff&size=40';
  ['nav-avatar','dd-avatar'].forEach(function(id){var e=document.getElementById(id);if(e)e.src=av;});
  var dn=document.getElementById('dd-name');if(dn)dn.textContent=user.name||'';
  var dr=document.getElementById('dd-role');if(dr)dr.textContent=user.activeRole||user.role||'';
  var da=document.getElementById('dd-admin-link');if(da){if(user.role==='admin')da.classList.remove('hidden');else da.classList.add('hidden');}
  var ds=document.getElementById('dd-switch-role');if(ds){if(user.roles&&user.roles.length>1)ds.classList.remove('hidden');else ds.classList.add('hidden');}
  var dl=document.getElementById('dd-switch-label');if(dl){var ar=user.activeRole||user.role;dl.textContent=ar==='enseignant'?'Passer Apprenant':'Passer Enseignant';}
  var ca=document.getElementById('composer-avatar');if(ca)ca.src=av;
  var hca=document.getElementById('home-composer-avatar');if(hca)hca.src=av;
}
window.toggleProfileMenu=function(){var d=document.getElementById('profile-dropdown');if(d)d.classList.toggle('hidden');};
window.closeDD=function(){var d=document.getElementById('profile-dropdown');if(d)d.classList.add('hidden');};
window.toggleMobileMenu=function(){var m=document.getElementById('mobile-menu');if(m)m.classList.toggle('hidden');};
window.closeMM=function(){var m=document.getElementById('mobile-menu');if(m)m.classList.add('hidden');};
window.toggleRole=async function(){var u=getSession();if(!u||!u.roles||u.roles.length<2)return;var ar=u.activeRole||u.role;u.activeRole=ar==='enseignant'?'apprenant':'enseignant';await fbSetUser(u.id,{activeRole:u.activeRole});setSession(u);await refreshInterface();};
document.addEventListener('click',function(e){if(!e.target.closest('.nav-profile-wrap'))closeDD();});

// ===== AUTH =====
window.switchAuth=function(id){['login','register','forgot','force-pass'].forEach(function(s){var el=document.getElementById('auth-'+s);if(el)el.classList.add('hidden');});var show=document.getElementById('auth-'+id);if(show)show.classList.remove('hidden');};
window.selectRole=function(r){document.querySelectorAll('.role-opt').forEach(function(b){b.classList.remove('active');});var btn=document.querySelector('.role-opt[data-role="'+r+'"]');if(btn)btn.classList.add('active');document.getElementById('reg-role').value=r;var opts=document.getElementById('reg-teacher-opts');if(opts){if(r==='enseignant'||r==='both')opts.classList.remove('hidden');else opts.classList.add('hidden');}};
window.appRegister=async function(){
  var role=document.getElementById('reg-role').value,name=document.getElementById('reg-name').value.trim(),phone=document.getElementById('reg-phone').value.trim(),city=document.getElementById('reg-city').value.trim(),pass=document.getElementById('reg-pass').value;
  if(!name||!phone||!city||!pass){alert("Remplissez tous les champs.");return;}
  if(pass.length<4){alert("Le mot de passe doit contenir au moins 4 caractères.");return;}
  var categories=[],disciplines=[],pubs=[];
  if(role==='enseignant'||role==='both'){
    document.querySelectorAll('#reg-categories-grid .chip-check input:checked').forEach(function(c){categories.push(c.value);});
    document.querySelectorAll('#reg-disciplines-grid .chip-check input:checked').forEach(function(c){disciplines.push(c.value);});
    document.querySelectorAll('.reg-public:checked').forEach(function(c){pubs.push(c.value);});
  }
  // S'authentifier avec Firebase Auth
  await fbAuthSignIn();
  var ex=await fbFindByPhone(phone);if(ex){alert("Numéro déjà inscrit.");return;}
  // Hacher le mot de passe avant de le stocker
  var hashedPass=await hashPassword(pass);
  var roles=role==='both'?['apprenant','enseignant']:[role];
  var u={id:'u_'+Date.now(),role:role==='both'?'enseignant':role,roles:roles,activeRole:role==='both'?'apprenant':role,name:name,phone:phone,city:city,password:hashedPass,status:'active',categories:categories,disciplines:disciplines,publics:pubs,bio:'',avatar:'',followers:[],following:[],isOnline:false,lastSeen:'',createdAt:new Date().toISOString()};
  await fbSetUser(u.id,u);setSession(u);await refreshInterface();
};
window.appLogin=async function(){
  var id=document.getElementById('login-id').value.trim(),pass=document.getElementById('login-pass').value;
  if(!id||!pass){alert("Remplissez vos identifiants.");return;}
  // S'authentifier avec Firebase Auth d'abord
  await fbAuthSignIn();
  var found=await fbFindByLogin(id,pass);
  if(found){
    if(found.status==='blocked'){alert("Compte bloqué.");return;}
    setSession(found);
    await refreshInterface();
  }else{
    alert("Identifiants incorrects.");
  }
};
window.appForgotPass=async function(){
  var phone=document.getElementById('forgot-phone').value.trim();
  // S'authentifier pour pouvoir écrire dans Firestore
  await fbAuthSignIn();
  var u=await fbFindByPhone(phone);
  if(u){
    // Hacher le mot de passe temporaire
    var hashedResetPass=await hashPassword('1234');
    alert("Mot de passe réinitialisé à '1234'.");
    await fbSetUser(u.id,{password:hashedResetPass,needsPasswordChange:true});
    switchAuth('login');
  }else{alert("Numéro introuvable.");}
};
window.appForcePassChange=async function(){
  var np=document.getElementById('force-new-pass').value;
  if(np.length<4){alert("Min 4 caractères.");return;}
  var cu=getSession();
  // Hacher le nouveau mot de passe
  var hashedPass=await hashPassword(np);
  await fbSetUser(cu.id,{password:hashedPass,needsPasswordChange:false});
  cu.needsPasswordChange=false;
  setSession(cu);
  await refreshInterface();
};
window.appLogout=async function(){
  // Déconnexion Firebase Auth + nettoyage session
  await fbAuthSignOut();
  clearSession();
  location.reload();
};



// ===== INIT REG CHIPS =====
function initRegChips(){
  var cg=document.getElementById('reg-categories-grid');
  if(cg&&cg.children.length===0)Object.keys(CATEGORIES).forEach(function(k){cg.innerHTML+='<label class="chip-check"><input type="checkbox" value="'+k+'"> '+k+'</label>';});
  var dg=document.getElementById('reg-disciplines-grid');
  if(dg&&dg.children.length===0){var allD=[];Object.keys(CATEGORIES).forEach(function(k){CATEGORIES[k].disciplines.forEach(function(d){if(allD.indexOf(d)===-1)allD.push(d);});});allD.forEach(function(d){dg.innerHTML+='<label class="chip-check"><input type="checkbox" value="'+d+'"> '+d+'</label>';});}
}
setTimeout(initRegChips,500);

// ===== HOME =====
async function loadHomeData(){
  var u=getSession();
  var hw=document.getElementById('hero-welcome');if(hw&&u)hw.innerHTML='Bienvenue <span class="gradient-text">'+sanitize(u.name)+'</span>';
  // Feed - toutes les publications
  var hf=document.getElementById('home-feed');
  if(hf){var posts=await fbGetPosts(50);hf.innerHTML='';
    if(posts.length===0)hf.innerHTML='<p class="text-muted text-center">Aucune publication pour le moment.</p>';
    else for(var i=0;i<posts.length;i++)hf.innerHTML+=renderPostCard(posts[i],u);
  }
  // Teachers preview
  var tg=document.getElementById('home-teachers');
  if(tg){tg.innerHTML='';var users=await fbGetAllUsers();var count=0;
    for(var i=0;i<users.length&&count<6;i++){var t=users[i];if(t.role!=='enseignant'||t.status!=='active')continue;count++;
      var av=t.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background=0d6e4e&color=fff&size=150';
      var badges='';if(t.categories)for(var j=0;j<Math.min(t.categories.length,2);j++)badges+='<span class="badge">'+t.categories[j]+'</span>';
      tg.innerHTML+='<div class="teacher-card" onclick="viewUserProfile(\''+t.id+'\')"><div class="teacher-avatar"><img src="'+av+'"></div><div class="teacher-info"><h3>'+sanitize(t.name)+'</h3><p class="text-sm"><i class="fa-solid fa-location-dot"></i> '+sanitize(t.city||'')+'</p><div class="specs-badges">'+badges+'</div></div></div>';
    }
    if(count===0)tg.innerHTML='<p class="text-muted text-center" style="grid-column:1/-1">Aucun enseignant.</p>';
  }
  // Load stories
  loadStoriesBar('stories-scroll');
}

// ===== STORIES =====
async function loadStoriesBar(containerId){
  var cu=getSession();if(!cu)return;
  var stories=await fbGetActiveStories();var c=document.getElementById(containerId);if(!c)return;c.innerHTML='';
  var grouped={};
  for(var i=0;i<stories.length;i++){var s=stories[i];if(!grouped[s.userId])grouped[s.userId]={user:s,stories:[]};grouped[s.userId].stories.push(s);}
  // Show followed users' stories + own
  var following=cu.following||[];
  Object.keys(grouped).forEach(function(uid){
    if(uid!==cu.id&&following.indexOf(uid)===-1)return;
    var g=grouped[uid];var av=g.user.userAvatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(g.user.userName)+'&background=0d6e4e&color=fff&size=64';
    c.innerHTML+='<div onclick="openStoryViewer(\''+uid+'\')" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;min-width:72px;"><div class="story-circle"><img src="'+av+'"></div><span>'+g.user.userName.split(' ')[0]+'</span></div>';
  });
}
async function loadStoriesView(){
  await loadStoriesBar('stories-scroll-full');
  var cu=getSession();if(!cu)return;
  var sf=document.getElementById('stories-feed');if(!sf)return;
  sf.innerHTML='<p class="text-muted text-center">Cliquez sur un cercle ci-dessus pour voir une story.</p>';
  var myStories=await fbGetUserStories(cu.id);
  if(myStories.length>0){sf.innerHTML='<h3 style="margin-bottom:12px;">Mes stories actives</h3>';
    for(var i=0;i<myStories.length;i++){var s=myStories[i];
      sf.innerHTML+='<div class="post-card" style="padding:16px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span>'+s.type+' · '+timeAgo(s.createdAt)+' · <i class="fa-solid fa-eye"></i> '+(s.views?s.views.length:0)+' vues</span><button class="btn-danger btn-sm" onclick="deleteMyStory(\''+s.id+'\')"><i class="fa-solid fa-trash"></i></button></div></div>';
    }
  }
}

window.openStoryViewer=async function(userId){
  var stories=await fbGetActiveStories();var userStories=[];
  for(var i=0;i<stories.length;i++)if(stories[i].userId===userId)userStories.push(stories[i]);
  if(userStories.length===0)return;
  window._viewingStories=userStories;window._storyIdx=0;showCurrentStory();
  document.getElementById('story-viewer').classList.remove('hidden');
};
function showCurrentStory(){
  if(window._storyTimer)clearTimeout(window._storyTimer);
  if(window._storyInterval)clearInterval(window._storyInterval);
  var s=window._viewingStories[window._storyIdx];if(!s)return;
  var av=s.userAvatar||'';document.getElementById('sv-avatar').src=av;
  document.getElementById('sv-name').textContent=s.userName;
  document.getElementById('sv-time').textContent=timeAgo(s.createdAt);
  // Views: only show count to story author
  var cu=getSession();var svViews=document.getElementById('sv-views');
  if(cu&&s.userId===cu.id){var uniqueViews=[];if(s.views){s.views.forEach(function(v){var uid=typeof v==='string'?v:v.userId;if(uniqueViews.indexOf(uid)===-1)uniqueViews.push(uid);});}svViews.innerHTML='<i class="fa-solid fa-eye"></i> '+uniqueViews.length;svViews.style.display='';}else{svViews.style.display='none';}
  var sc=document.getElementById('sv-content');
  if(s.type==='text')sc.innerHTML='<div class="text-story" style="background:'+(s.bgColor||'#0d6e4e')+'">'+sanitize(s.text)+'</div>';
  else if(s.mediaUrl){if(s.mediaType&&s.mediaType.startsWith('video/'))sc.innerHTML='<video src="'+s.mediaUrl+'" autoplay></video>';else sc.innerHTML='<img src="'+s.mediaUrl+'">';}
  if(cu)fbAddStoryView(s.id,cu.id).catch(function(){});
  // Progress bar
  var sp=document.getElementById('story-progress');if(sp){sp.innerHTML='';for(var i=0;i<window._viewingStories.length;i++){var d=document.createElement('div');if(i<window._storyIdx)d.classList.add('active');if(i===window._storyIdx){var fill=document.createElement('div');fill.className='fill';d.appendChild(fill);}sp.appendChild(d);}}
  var duration=(s.type==='text'||!s.mediaType||!s.mediaType.startsWith('video/'))?60000:300000;
  var elapsed=0;var step=100;
  window._storyInterval=setInterval(function(){elapsed+=step;var fill=document.querySelector('.story-progress .fill');if(fill)fill.style.width=(elapsed/duration*100)+'%';},step);
  window._storyTimer=setTimeout(function(){window._storyIdx++;if(window._storyIdx>=window._viewingStories.length)closeStoryViewer();else showCurrentStory();},duration);
}
window.handleStoryClick=function(e){if(e.target.closest('.story-close')||e.target.closest('.story-reply-input'))return;var w=window.innerWidth;if(e.clientX>w/2){window._storyIdx++;if(window._storyIdx>=window._viewingStories.length)closeStoryViewer();else showCurrentStory();}else{if(window._storyIdx>0){window._storyIdx--;showCurrentStory();}}};
window.closeStoryViewer=function(){if(window._storyTimer)clearTimeout(window._storyTimer);if(window._storyInterval)clearInterval(window._storyInterval);document.getElementById('story-viewer').classList.add('hidden');};
window.sendStoryReply=async function(){var input=document.getElementById('sv-reply');if(!input||!input.value.trim())return;var cu=getSession();if(!cu)return;var s=window._viewingStories[window._storyIdx];if(!s||s.userId===cu.id){alert('Impossible de répondre à votre propre story.');return;}var conv=await fbGetOrCreateConversation(cu.id,s.userId);await fbSendMessage(conv.id,{text:input.value.trim(),senderId:cu.id,recipientId:s.userId,timestamp:new Date().toISOString(),type:'text',storyRef:s.id});input.value='';alert('Réponse envoyée en message privé !');};
window.openStoryCreator=function(){document.getElementById('story-creator').classList.remove('hidden');initStoryCreator();};
function initStoryCreator(){var colors=['#0d6e4e','#1abc9c','#d4a017','#e63946','#6366f1','#ec4899','#000'];var cp=document.getElementById('sc-colors');if(cp){cp.innerHTML='';colors.forEach(function(c,i){cp.innerHTML+='<div style="background:'+c+'"'+(i===0?' class="active"':'')+' onclick="pickStoryColor(this,\''+c+'\')"></div>';});}window._storyColor=colors[0];window._storyType='text';}
window.pickStoryColor=function(el,c){window._storyColor=c;document.querySelectorAll('#sc-colors div').forEach(function(d){d.classList.remove('active');});el.classList.add('active');};
window.setStoryType=function(type){window._storyType=type;document.querySelectorAll('.story-type-tabs button').forEach(function(b){b.classList.remove('active');});event.target.closest('button').classList.add('active');var ta=document.getElementById('sc-text-area'),ma=document.getElementById('sc-media-area');if(type==='text'){if(ta)ta.classList.remove('hidden');if(ma)ma.classList.add('hidden');}else{if(ta)ta.classList.add('hidden');if(ma)ma.classList.remove('hidden');}};
window.publishStory=async function(){var cu=getSession();if(!cu)return;var data={userId:cu.id,userName:cu.name,userAvatar:cu.avatar||'',type:window._storyType||'text',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),views:[],replies:[]};if(data.type==='text'){data.text=(document.getElementById('sc-text')||{}).value||'';data.bgColor=window._storyColor||'#0d6e4e';if(!data.text){alert('Écrivez quelque chose.');return;}}else{var fi=document.getElementById('sc-file');if(!fi||!fi.files||!fi.files[0]){alert('Choisissez un fichier.');return;}var mid='story_'+Date.now();data.mediaUrl=await fbUploadFile(mid,fi.files[0]);data.mediaType=fi.files[0].type;}await fbCreateStory(data);closeModal('story-creator');alert('Story publiée !');};

// ===== CATEGORIES =====
function loadCategories(){
  var cg=document.getElementById('categories-full');if(!cg)return;cg.innerHTML='';
  Object.keys(CATEGORIES).forEach(function(k){var c=CATEGORIES[k];
    var discList=c.disciplines.map(function(d){return '<span class="badge">'+d+'</span>';}).join('');
    cg.innerHTML+='<div class="cat-card"><div onclick="filterByCategory(\''+k+'\')" style="cursor:pointer;"><i class="fa-solid '+c.icon+'" style="color:'+c.color+'"></i><h3>'+k+'</h3><span>'+c.disciplines.length+' disciplines</span></div><div class="cat-disc-toggle"><button class="btn-sm btn-outline-main" onclick="event.stopPropagation();var dl=this.parentElement.querySelector(\'.cat-disc-list\');dl.classList.toggle(\'hidden\');this.textContent=dl.classList.contains(\'hidden\')?\' Voir disciplines\':\' Masquer\'"> Voir disciplines</button><div class="cat-disc-list hidden">'+discList+'</div></div></div>';
  });
}
window.filterByCategory=function(cat){goToView('teachers');setTimeout(function(){var sel=document.getElementById('t-category');if(sel){sel.value=cat;updateDisciplineFilter();renderTeachers();}},100);};

// ===== TEACHERS =====
async function loadTeachersView(){
  var sel=document.getElementById('t-category');if(sel&&sel.options.length<=1)Object.keys(CATEGORIES).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k;sel.appendChild(o);});
  await renderTeachers();
}
window.updateDisciplineFilter=function(){var cat=document.getElementById('t-category').value;var dSel=document.getElementById('t-discipline');if(!dSel)return;dSel.innerHTML='<option value="">Toutes disciplines</option>';if(cat&&CATEGORIES[cat])CATEGORIES[cat].disciplines.forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;dSel.appendChild(o);});};
window.renderTeachers=async function(){
  var container=document.getElementById('teachers-list');if(!container)return;
  container.innerHTML='<p class="text-muted text-center" style="grid-column:1/-1">Chargement...</p>';
  var search=((document.getElementById('t-search')||{}).value||'').toLowerCase();
  var cat=(document.getElementById('t-category')||{}).value||'';
  var disc=(document.getElementById('t-discipline')||{}).value||'';
  var pub=(document.getElementById('t-public')||{}).value||'';
  var users=await fbGetAllUsers();var cu=getSession();container.innerHTML='';var count=0;
  for(var i=0;i<users.length;i++){var t=users[i];
    if(t.role!=='enseignant'||t.status!=='active')continue;
    if(search&&t.name.toLowerCase().indexOf(search)===-1&&(!t.city||t.city.toLowerCase().indexOf(search)===-1))continue;
    if(cat&&(!t.categories||t.categories.indexOf(cat)===-1))continue;
    if(disc&&(!t.disciplines||t.disciplines.indexOf(disc)===-1))continue;
    if(pub&&(!t.publics||t.publics.indexOf(pub)===-1))continue;count++;
    var av=t.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background=0d6e4e&color=fff&size=150';
    var badges='';if(t.categories)for(var j=0;j<t.categories.length;j++)badges+='<span class="badge">'+t.categories[j]+'</span>';
    if(t.disciplines)for(var j=0;j<t.disciplines.length;j++)badges+='<span class="badge">'+t.disciplines[j]+'</span>';
    var isFollowing=cu&&cu.following&&cu.following.indexOf(t.id)!==-1;
    var followBtn=cu&&cu.id!==t.id?(isFollowing?'<button class="btn-outline-main w-full" style="margin-top:6px" onclick="event.stopPropagation();unfollowUser(\''+t.id+'\')"><i class="fa-solid fa-user-check"></i> Abonné</button>':'<button class="btn-main w-full" style="margin-top:6px" onclick="event.stopPropagation();followUser(\''+t.id+'\')"><i class="fa-solid fa-user-plus"></i> Suivre</button>'):'';
    var msgBtn=cu&&cu.id!==t.id?'<button class="btn-outline-main w-full" style="margin-top:6px" onclick="event.stopPropagation();startConversation(\''+t.id+'\')"><i class="fa-solid fa-comment-dots"></i> Message</button>':'';
    container.innerHTML+='<div class="teacher-card" onclick="viewUserProfile(\''+t.id+'\')"><div class="teacher-avatar"><img src="'+av+'"></div><div class="teacher-info"><h3>'+sanitize(t.name)+'</h3><p class="text-sm"><i class="fa-solid fa-location-dot"></i> '+sanitize(t.city||'')+'</p><div class="specs-badges">'+badges+'</div>'+followBtn+msgBtn+'</div></div>';
  }
  if(count===0)container.innerHTML='<p class="text-muted text-center" style="grid-column:1/-1">Aucun enseignant trouvé.</p>';
};
window.handleGlobalSearch=function(e){if(e.key==='Enter'){var v=document.getElementById('global-search').value;goToView('teachers');setTimeout(function(){var s=document.getElementById('t-search');if(s){s.value=v;renderTeachers();}},100);}};

// ===== FOLLOW =====
window.followUser=async function(uid){var cu=getSession();if(!cu)return;await fbFollow(cu.id,uid);cu.following=cu.following||[];cu.following.push(uid);setSession(cu);renderTeachers();};
window.unfollowUser=async function(uid){var cu=getSession();if(!cu)return;await fbUnfollow(cu.id,uid);cu.following=(cu.following||[]).filter(function(f){return f!==uid;});setSession(cu);renderTeachers();};

// ===== UTILS =====
function timeAgo(d){var s=Math.floor((new Date()-new Date(d))/1000);if(s<60)return 'à l\'instant';if(s<3600)return Math.floor(s/60)+'min';if(s<86400)return Math.floor(s/3600)+'h';return Math.floor(s/86400)+'j';}

// ===== FEED =====
async function loadFeed(){
  var cu=getSession();if(!cu)return;
  var ca=document.getElementById('composer-avatar');if(ca)ca.src=cu.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(cu.name)+'&background=0d6e4e&color=fff&size=42';
  var fp=document.getElementById('feed-posts');if(!fp)return;fp.innerHTML='<p class="text-muted text-center">Chargement...</p>';
  var posts=await fbGetPosts(50);fp.innerHTML='';
  for(var i=0;i<posts.length;i++){var p=posts[i];
    fp.innerHTML+=renderPostCard(p,cu);
  }
  if(fp.innerHTML==='')fp.innerHTML='<p class="empty-msg">Aucune publication pour le moment.</p>';
}
function renderPostCard(p,cu){
  var av=p.userAvatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(p.userName)+'&background=0d6e4e&color=fff&size=42';
  var liked=p.likes&&p.likes.indexOf(cu.id)!==-1;
  var isAdmin=cu.role==='admin'||cu.activeRole==='admin';
  var del=(p.userId===cu.id||isAdmin)?'<button class="post-delete" onclick="event.stopPropagation();deletePost(\''+p.id+'\')"><i class="fa-solid fa-trash"></i></button>':'';
  var media='';if(p.mediaUrl){if(p.mediaType&&p.mediaType.startsWith('video/'))media='<div class="post-media"><video src="'+p.mediaUrl+'" controls></video></div>';else media='<div class="post-media"><img src="'+p.mediaUrl+'" onclick="openLightbox(\''+p.mediaUrl.replace(/'/g,"\\'")+'\')"></div>';}
  return '<div class="post-card"><div class="post-header"><img src="'+av+'" onclick="viewUserProfile(\''+p.userId+'\')"><div class="post-header-info"><strong onclick="viewUserProfile(\''+p.userId+'\')">'+sanitize(p.userName)+'</strong><small>'+timeAgo(p.createdAt)+'</small></div>'+del+'</div>'+(p.text?'<div class="post-body"><p>'+sanitize(p.text)+'</p></div>':'')+media+'<div class="post-actions"><button class="post-action-btn'+(liked?' liked':'')+'" onclick="toggleLike(\''+p.id+'\','+liked+')"><i class="fa-'+(liked?'solid':'regular')+' fa-heart"></i> '+(p.likes?p.likes.length:0)+'</button><button class="post-action-btn" onclick="openComments(\''+p.id+'\')"><i class="fa-regular fa-comment"></i> Commenter</button><button class="post-action-btn" onclick="toggleFavPost(\''+p.id+'\')"><i class="fa-regular fa-bookmark"></i> Sauver</button></div></div>';
}
window.previewPostMedia=function(input){
  var prev=document.getElementById('post-media-preview');if(!prev)return;
  if(input.files&&input.files[0]){prev.classList.remove('hidden');var f=input.files[0];
    if(f.type.startsWith('video/'))prev.innerHTML='<video src="'+URL.createObjectURL(f)+'" controls style="max-height:200px;border-radius:12px;"></video>';
    else prev.innerHTML='<img src="'+URL.createObjectURL(f)+'" style="max-height:200px;border-radius:12px;">';
  }else{prev.classList.add('hidden');prev.innerHTML='';}
};
window.publishPost=async function(){
  var cu=getSession();if(!cu)return;var text=(document.getElementById('post-text')||{}).value||'';
  var fi=document.getElementById('post-media');var hasMedia=fi&&fi.files&&fi.files[0];
  if(!text.trim()&&!hasMedia){alert('Écrivez quelque chose ou ajoutez un média.');return;}
  var data={userId:cu.id,userName:cu.name,userAvatar:cu.avatar||'',text:text,likes:[],createdAt:new Date().toISOString()};
  if(hasMedia){var mid='post_'+Date.now();data.mediaUrl=await fbUploadFile(mid,fi.files[0]);data.mediaType=fi.files[0].type;}
  await fbCreatePost(data);document.getElementById('post-text').value='';
  if(fi)fi.value='';var prev=document.getElementById('post-media-preview');if(prev){prev.classList.add('hidden');prev.innerHTML='';}
  loadFeed();
};
// Home post composer
window.previewHomePostMedia=function(input){
  var prev=document.getElementById('home-post-media-preview');if(!prev)return;
  if(input.files&&input.files[0]){prev.classList.remove('hidden');var f=input.files[0];
    if(f.type.startsWith('video/'))prev.innerHTML='<video src="'+URL.createObjectURL(f)+'" controls style="max-height:200px;border-radius:12px;"></video>';
    else prev.innerHTML='<img src="'+URL.createObjectURL(f)+'" style="max-height:200px;border-radius:12px;">';
  }else{prev.classList.add('hidden');prev.innerHTML='';}
};
window.publishHomePost=async function(){
  var cu=getSession();if(!cu)return;var text=(document.getElementById('home-post-text')||{}).value||'';
  var fi=document.getElementById('home-post-media');var hasMedia=fi&&fi.files&&fi.files[0];
  if(!text.trim()&&!hasMedia){alert('Écrivez quelque chose ou ajoutez un média.');return;}
  var data={userId:cu.id,userName:cu.name,userAvatar:cu.avatar||'',text:text,likes:[],createdAt:new Date().toISOString()};
  if(hasMedia){var mid='post_'+Date.now();data.mediaUrl=await fbUploadFile(mid,fi.files[0]);data.mediaType=fi.files[0].type;}
  await fbCreatePost(data);document.getElementById('home-post-text').value='';
  if(fi)fi.value='';var prev=document.getElementById('home-post-media-preview');if(prev){prev.classList.add('hidden');prev.innerHTML='';}
  loadHomeData();
};
window.deletePost=async function(pid){if(!confirm('Supprimer ?'))return;await fbDeletePost(pid);loadFeed();};
window.toggleLike=async function(pid,liked){var cu=getSession();if(!cu)return;if(liked)await fbUnlikePost(pid,cu.id);else await fbLikePost(pid,cu.id);loadFeed();};
window._replyToCommentId=null;window._replyToCommentName=null;
window.openComments=async function(pid){
  window._commentPostId=pid;window._replyToCommentId=null;window._replyToCommentName=null;
  document.getElementById('comments-modal').classList.remove('hidden');
  var ri=document.getElementById('reply-indicator');if(ri)ri.classList.add('hidden');
  var cl=document.getElementById('comments-list');if(!cl)return;cl.innerHTML='<p class="text-muted">Chargement...</p>';
  var comments=await fbGetComments(pid);var cu=getSession();cl.innerHTML='';
  if(comments.length===0){cl.innerHTML='<p class="text-muted">Aucun commentaire.</p>';return;}
  var topLevel=comments.filter(function(c){return !c.parentId;});
  var replies=comments.filter(function(c){return !!c.parentId;});
  for(var i=0;i<topLevel.length;i++){var c=topLevel[i];
    var av=c.userAvatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(c.userName)+'&background=0d6e4e&color=fff&size=32';
    var del=cu&&c.userId===cu.id?'<button class="comment-delete" onclick="deleteComment(\''+pid+'\',\''+c.id+'\')"><i class="fa-solid fa-trash"></i></button>':'';
    cl.innerHTML+='<div class="comment-item"><img src="'+av+'"><div class="comment-item-body"><strong>'+sanitize(c.userName)+'</strong>'+del+'<p>'+sanitize(c.text)+'</p><small>'+timeAgo(c.createdAt)+'</small><br><button class="comment-reply-btn" onclick="setReplyTo(\''+c.id+'\',\''+sanitize(c.userName).replace(/'/g,"\\'")+'\')"><i class="fa-solid fa-reply"></i> Répondre</button></div></div>';
    var childReplies=replies.filter(function(r){return r.parentId===c.id;});
    if(childReplies.length>0){
      var repliesHtml='<div class="comment-replies">';
      for(var j=0;j<childReplies.length;j++){var r=childReplies[j];
        var rav=r.userAvatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(r.userName)+'&background=0d6e4e&color=fff&size=26';
        var rdel=cu&&r.userId===cu.id?'<button class="comment-delete" onclick="deleteComment(\''+pid+'\',\''+r.id+'\')"><i class="fa-solid fa-trash"></i></button>':'';
        repliesHtml+='<div class="comment-item"><img src="'+rav+'"><div class="comment-item-body"><strong>'+sanitize(r.userName)+'</strong>'+rdel+'<p>'+sanitize(r.text)+'</p><small>'+timeAgo(r.createdAt)+'</small></div></div>';}
      repliesHtml+='</div>';cl.innerHTML+=repliesHtml;
    }
  }
};
window.setReplyTo=function(commentId,commentName){
  window._replyToCommentId=commentId;window._replyToCommentName=commentName;
  var ri=document.getElementById('reply-indicator');if(ri){ri.classList.remove('hidden');}
  var rit=document.getElementById('reply-indicator-text');if(rit)rit.textContent='Répondre à '+commentName;
  var input=document.getElementById('comment-text');if(input){input.placeholder='Répondre à '+commentName+'...';input.focus();}
};
window.cancelReply=function(){
  window._replyToCommentId=null;window._replyToCommentName=null;
  var ri=document.getElementById('reply-indicator');if(ri)ri.classList.add('hidden');
  var input=document.getElementById('comment-text');if(input)input.placeholder='Votre commentaire...';
};
window.postComment=async function(){
  var cu=getSession();if(!cu||!window._commentPostId)return;
  var input=document.getElementById('comment-text');if(!input||!input.value.trim())return;
  var data={userId:cu.id,userName:cu.name,userAvatar:cu.avatar||'',text:input.value.trim(),createdAt:new Date().toISOString()};
  if(window._replyToCommentId)data.parentId=window._replyToCommentId;
  await fbAddComment(window._commentPostId,data);
  input.value='';cancelReply();openComments(window._commentPostId);
};
window.deleteComment=async function(pid,cid){if(!confirm('Supprimer ?'))return;await fbDeleteComment(pid,cid);openComments(pid);};
window.toggleFavPost=async function(pid){var cu=getSession();if(!cu)return;var isFav=await fbIsFavorite(cu.id,pid);if(isFav)await fbRemoveFavorite(cu.id,pid);else await fbAddFavorite(cu.id,{id:pid,type:'post',savedAt:new Date().toISOString()});};
// Lightbox
window.openLightbox=function(url){var lb=document.getElementById('image-lightbox');var img=document.getElementById('lightbox-img');if(lb&&img){img.src=url;lb.classList.remove('hidden');}};
window.closeLightbox=function(){var lb=document.getElementById('image-lightbox');if(lb)lb.classList.add('hidden');};

// ===== USER PROFILE =====
window.viewUserProfile=async function(uid){
  var cu=getSession();if(!cu)return;if(uid===cu.id){goToView('profile');return;}
  var u=await fbGetUser(uid);if(!u)return;
  goToView('user-profile');
  var c=document.getElementById('user-profile-content');if(!c)return;
  var av=u.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(u.name)+'&background=0d6e4e&color=fff&size=100';
  var isFollowing=cu.following&&cu.following.indexOf(uid)!==-1;
  var badges='';if(u.categories)u.categories.forEach(function(cat){badges+='<span class="badge">'+cat+'</span> ';});
  if(u.disciplines)u.disciplines.forEach(function(d){badges+='<span class="badge">'+d+'</span> ';});
  var followBtn=isFollowing?'<button class="btn-outline-main" onclick="unfollowUser(\''+uid+'\');viewUserProfile(\''+uid+'\')"><i class="fa-solid fa-user-check"></i> Abonné</button>':'<button class="btn-main" onclick="followUser(\''+uid+'\');viewUserProfile(\''+uid+'\')"><i class="fa-solid fa-user-plus"></i> Suivre</button>';
  var msgBtn=cu.id!==uid?'<button class="btn-outline-main" onclick="startConversation(\''+uid+'\')"><i class="fa-solid fa-comment-dots"></i> Message</button>':'';
  var favBtn='<button class="btn-outline-main" onclick="toggleFavProfile(\''+uid+'\')"><i class="fa-regular fa-bookmark"></i> Sauver</button>';
  c.innerHTML='<div class="profile-cover"><div class="profile-cover-gradient"></div><div class="profile-main-info"><div class="profile-avatar-wrap"><img src="'+av+'" class="profile-avatar"></div><h1>'+sanitize(u.name)+'</h1><p class="role-badge">'+(u.activeRole||u.role)+'</p><div class="profile-stats-row"><div class="prof-stat"><strong>'+(u.followers||[]).length+'</strong><span>Abonnés</span></div><div class="prof-stat"><strong>'+(u.following||[]).length+'</strong><span>Abonnements</span></div></div><div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">'+followBtn+msgBtn+favBtn+'</div></div></div>'
    +(u.city?'<p class="text-center text-muted mt-1"><i class="fa-solid fa-location-dot"></i> '+sanitize(u.city)+'</p>':'')
    +(badges?'<div class="text-center mt-1">'+badges+'</div>':'')
    +(u.bio?'<div class="profile-body mt-2"><h3>Présentation</h3><p style="white-space:pre-wrap;">'+sanitize(u.bio)+'</p></div>':'')
    +'<div class="profile-posts-section mt-3"><h3><i class="fa-solid fa-newspaper"></i> Publications</h3><div id="user-posts-list"></div></div>';
  var posts=await fbGetUserPosts(uid);var upl=document.getElementById('user-posts-list');
  if(upl){if(posts.length===0)upl.innerHTML='<p class="empty-msg">Aucune publication.</p>';else{upl.innerHTML='';for(var i=0;i<posts.length;i++)upl.innerHTML+=renderPostCard(posts[i],cu);}}
};
window.toggleFavProfile=async function(uid){var cu=getSession();if(!cu)return;var isFav=await fbIsFavorite(cu.id,uid);if(isFav)await fbRemoveFavorite(cu.id,uid);else await fbAddFavorite(cu.id,{id:uid,type:'profile',savedAt:new Date().toISOString()});alert(isFav?'Retiré des favoris':'Ajouté aux favoris');};
window.closeModal=function(id){document.getElementById(id).classList.add('hidden');};

// ===== MESSAGES =====
var currentConvId=null,msgListener=null,convListener=null;
async function loadMessages(){var cu=getSession();if(!cu)return;if(convListener)convListener();convListener=fbListenConversations(cu.id,function(convs){renderConvList(convs);});}
async function renderConvList(convs){
  var cl=document.getElementById('conv-list');if(!cl)return;var cu=getSession();if(!cu)return;
  if(convs.length===0){cl.innerHTML='<p class="empty-msg">Aucune conversation</p>';return;}cl.innerHTML='';var hasConv=false;
  for(var i=0;i<convs.length;i++){var c=convs[i];var otherId=c.participants[0]===cu.id?c.participants[1]:c.participants[0];
    if(otherId===cu.id)continue;
    var other=await fbGetUser(otherId);if(!other)continue;hasConv=true;
    var av=other.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(other.name)+'&background=0d6e4e&color=fff&size=44';
    var unread=c.unread&&c.unread[cu.id]?c.unread[cu.id]:0;var lastMsg=c.lastMessage?c.lastMessage.text||'':'';
    var div=document.createElement('div');div.className='conv-item'+(currentConvId===c.id?' active':'');div.setAttribute('data-conv-id',c.id);
    div.innerHTML='<img src="'+av+'"><div class="conv-item-info"><strong>'+other.name+'</strong><p>'+lastMsg.substring(0,40)+'</p></div>'+(unread>0?'<div class="conv-unread">'+unread+'</div>':'');
    div.onclick=(function(cid,o){return function(){openConversation(cid,o);};})(c.id,other);cl.appendChild(div);
  }
  if(!hasConv)cl.innerHTML='<p class="empty-msg">Aucune conversation</p>';
}
async function openConversation(convId,otherUser){
  currentConvId=convId;var cu=getSession();var ca=document.getElementById('chat-area');if(!ca)return;
  // Hide sidebar on mobile
  var sidebar=document.getElementById('conv-sidebar');if(sidebar)sidebar.classList.add('conv-sidebar-hidden');
  var av=otherUser.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(otherUser.name)+'&background=0d6e4e&color=fff&size=40';
  ca.innerHTML='<div class="chat-header"><button class="chat-back-btn" onclick="closeChatGoBack()"><i class="fa-solid fa-arrow-left"></i></button><img src="'+av+'" onclick="viewUserProfile(\''+otherUser.id+'\')"><div><strong>'+otherUser.name+'</strong><br><small>'+(otherUser.city||'')+'</small></div></div><div class="chat-messages" id="chat-messages"></div><div class="chat-attachments"><label class="chat-attach-btn" title="Photo"><i class="fa-solid fa-image"></i><input type="file" accept="image/*" class="hidden" onchange="sendFileMsg(this,\'image\')"></label><label class="chat-attach-btn" title="Vidéo"><i class="fa-solid fa-video"></i><input type="file" accept="video/*" class="hidden" onchange="sendFileMsg(this,\'video\')"></label><label class="chat-attach-btn" title="Document"><i class="fa-solid fa-paperclip"></i><input type="file" class="hidden" onchange="sendFileMsg(this,\'file\')"></label><button class="chat-attach-btn" title="Audio" onclick="recordVoice()"><i class="fa-solid fa-microphone"></i></button></div><div class="chat-input"><input type="text" id="msg-input" placeholder="Votre message..." onkeyup="if(event.key===\'Enter\')sendMessage()"><button onclick="sendMessage()"><i class="fa-solid fa-paper-plane"></i></button></div>';
  await fbMarkAsRead(convId,cu.id);if(msgListener)msgListener();
  msgListener=fbListenMessages(convId,function(msgs){
    var mc=document.getElementById('chat-messages');if(!mc)return;mc.innerHTML='';
    for(var i=0;i<msgs.length;i++){var m=msgs[i];var cls=m.senderId===cu.id?'sent':'received';var content='';
      if(m.type==='image')content='<img src="'+m.fileUrl+'" onclick="openLightbox(\''+m.fileUrl.replace(/'/g,"\\'")+'\')">'+((m.storyRef)?'<div class="story-ref-link" onclick="openStoryFromMsg(\''+m.storyRef+'\')" style="font-size:.75rem;opacity:.7;margin-top:4px;cursor:pointer;text-decoration:underline;">📖 Voir la story</div>':'');
      else if(m.type==='video')content='<video src="'+m.fileUrl+'" controls></video>';
      else if(m.type==='voice')content='<div class="voice-player"><button class="vp-play" onclick="toggleVoicePlay(this,\''+m.fileUrl.replace(/'/g,"\\'")+'\')"><i class="fa-solid fa-play"></i></button><div class="vp-track"><div class="vp-progress-wrap" onclick="seekVoice(event,this)"><div class="vp-progress-fill"></div></div><div class="vp-meta"><span class="vp-time">0:00</span><button class="vp-speed" onclick="cycleSpeed(this)">1x</button></div></div></div>';
      else if(m.type==='file')content='<div class="file-attach"><i class="fa-solid fa-file"></i><a href="'+m.fileUrl+'" target="_blank" style="color:inherit;">'+m.fileName+'</a></div>';
      else content=(m.storyRef?'<div class="story-ref-link" onclick="openStoryFromMsg(\''+m.storyRef+'\')" style="font-size:.75rem;opacity:.7;margin-bottom:4px;cursor:pointer;text-decoration:underline;">📖 Voir la story</div>':'')+(m.text||'');
      var delBtn=m.senderId===cu.id?'<button class="msg-delete-btn" onclick="deleteMsg(\''+convId+'\',\''+m.id+'\')"><i class="fa-solid fa-trash"></i></button>':'';
      mc.innerHTML+='<div class="msg-bubble '+cls+'">'+content+delBtn+'<span class="msg-time">'+new Date(m.timestamp).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})+'</span></div>';
    }mc.scrollTop=mc.scrollHeight;
    // Re-mark as read when new messages arrive while conversation is open
    fbMarkAsRead(convId,cu.id).catch(function(){});
  });
}
window.sendMessage=async function(){var input=document.getElementById('msg-input');if(!input||!input.value.trim())return;var cu=getSession();if(!cu||!currentConvId)return;var doc=await db.collection('conversations').doc(currentConvId).get();if(!doc.exists)return;var conv=doc.data();var rid=conv.participants[0]===cu.id?conv.participants[1]:conv.participants[0];await fbSendMessage(currentConvId,{text:input.value.trim(),senderId:cu.id,recipientId:rid,timestamp:new Date().toISOString(),type:'text'});input.value='';};
window.sendFileMsg=async function(input,type){if(!input.files||!input.files[0])return;var cu=getSession();if(!cu||!currentConvId)return;var file=input.files[0];var mid='chat_'+Date.now();var url=await fbUploadFile(mid,file);var doc=await db.collection('conversations').doc(currentConvId).get();if(!doc.exists)return;var conv=doc.data();var rid=conv.participants[0]===cu.id?conv.participants[1]:conv.participants[0];await fbSendMessage(currentConvId,{senderId:cu.id,recipientId:rid,timestamp:new Date().toISOString(),type:type,fileUrl:url,fileName:file.name,text:type==='image'?'📷 Photo':type==='video'?'🎥 Vidéo':'📎 '+file.name});input.value='';};
window.recordVoice=function(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Votre navigateur ne supporte pas l\'enregistrement audio.');return;}
  if(window._recording){window._mediaRecorder.stop();return;}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    window._recording=true;window._audioChunks=[];
    var mr=new MediaRecorder(stream);window._mediaRecorder=mr;
    mr.ondataavailable=function(e){window._audioChunks.push(e.data);};
    mr.onstop=async function(){
      window._recording=false;stream.getTracks().forEach(function(t){t.stop();});
      var blob=new Blob(window._audioChunks,{type:'audio/webm'});var cu=getSession();if(!cu||!currentConvId)return;
      var mid='voice_'+Date.now();var url=await fbUploadFile(mid,blob);
      var doc=await db.collection('conversations').doc(currentConvId).get();if(!doc.exists)return;
      var conv=doc.data();var rid=conv.participants[0]===cu.id?conv.participants[1]:conv.participants[0];
      await fbSendMessage(currentConvId,{senderId:cu.id,recipientId:rid,timestamp:new Date().toISOString(),type:'voice',fileUrl:url,text:'🎤 Message vocal'});
    };
    mr.start();alert('🔴 Enregistrement en cours... Cliquez à nouveau sur le micro pour arrêter.');
  }).catch(function(e){alert('Impossible d\'accéder au micro: '+e.message);});
};
window.deleteMsg=async function(convId,msgId){if(!confirm('Supprimer ce message ?'))return;await db.collection('conversations').doc(convId).collection('messages').doc(msgId).delete();};
window.deleteMyStory=async function(storyId){if(!confirm('Supprimer cette story ?'))return;await fbDeleteStory(storyId);alert('Story supprimée.');loadStoriesView();};
window._voiceAudios={};
window.toggleVoicePlay=function(btn,url){var player=btn.closest('.voice-player');if(window._voiceAudios[url]&&!window._voiceAudios[url].paused){window._voiceAudios[url].pause();btn.innerHTML='<i class="fa-solid fa-play"></i>';return;}if(!window._voiceAudios[url]){window._voiceAudios[url]=new Audio(url);}var a=window._voiceAudios[url];a.playbackRate=parseFloat((player.querySelector('.vp-speed')||{}).textContent)||1;a.play();btn.innerHTML='<i class="fa-solid fa-pause"></i>';var fill=player.querySelector('.vp-progress-fill');var timeEl=player.querySelector('.vp-time');a.ontimeupdate=function(){if(a.duration){var pct=(a.currentTime/a.duration)*100;if(fill)fill.style.width=pct+'%';if(timeEl){var m=Math.floor(a.currentTime/60);var s=Math.floor(a.currentTime%60);timeEl.textContent=m+':'+(s<10?'0':'')+s;}}};a.onended=function(){btn.innerHTML='<i class="fa-solid fa-play"></i>';if(fill)fill.style.width='0%';if(timeEl)timeEl.textContent='0:00';};};
window.seekVoice=function(e,wrap){var rect=wrap.getBoundingClientRect();var pct=(e.clientX-rect.left)/rect.width;var player=wrap.closest('.voice-player');var url='';var btn=player.querySelector('.vp-play');if(btn&&btn.getAttribute('onclick')){var match=btn.getAttribute('onclick').match(/toggleVoicePlay\(this,'([^']+)'\)/);if(match)url=match[1];}if(url&&window._voiceAudios[url]&&window._voiceAudios[url].duration){window._voiceAudios[url].currentTime=pct*window._voiceAudios[url].duration;}};
window.cycleSpeed=function(btn){var speeds=[1,1.5,2];var cur=parseFloat(btn.textContent)||1;var idx=speeds.indexOf(cur);var next=speeds[(idx+1)%speeds.length];btn.textContent=next+'x';var player=btn.closest('.voice-player');var playBtn=player.querySelector('.vp-play');if(playBtn&&playBtn.getAttribute('onclick')){var match=playBtn.getAttribute('onclick').match(/toggleVoicePlay\(this,'([^']+)'\)/);if(match&&window._voiceAudios[match[1]])window._voiceAudios[match[1]].playbackRate=next;}};
window.switchProfileRole=async function(role){var cu=getSession();if(!cu)return;cu.activeRole=role;await fbSetUser(cu.id,{activeRole:role});setSession(cu);setupNav(cu);loadProfile();alert('Rôle actif : '+role);};
window.startConversation=async function(otherId){var cu=getSession();if(!cu||cu.id===otherId){alert('Vous ne pouvez pas vous envoyer un message.');return;}var conv=await fbGetOrCreateConversation(cu.id,otherId);var other=await fbGetUser(otherId);if(!other)return;goToView('messages');setTimeout(function(){openConversation(conv.id,other);},300);};
window.filterConversations=function(){var q=((document.getElementById('conv-search-input')||{}).value||'').toLowerCase();document.querySelectorAll('.conv-item').forEach(function(c){var n=c.querySelector('strong');if(n&&n.textContent.toLowerCase().indexOf(q)!==-1)c.style.display='';else c.style.display='none';});};
window.closeChatGoBack=function(){var sidebar=document.getElementById('conv-sidebar');if(sidebar)sidebar.classList.remove('conv-sidebar-hidden');var ca=document.getElementById('chat-area');if(ca)ca.innerHTML='<div class="chat-placeholder"><i class="fa-solid fa-comments"></i><h3>Sélectionnez une conversation</h3></div>';currentConvId=null;if(msgListener){msgListener();msgListener=null;}};
window.openStoryFromMsg=async function(storyId){try{var doc=await db.collection('stories').doc(storyId).get();if(doc.exists){var s=doc.data();window._viewingStories=[s];window._storyIdx=0;showCurrentStory();document.getElementById('story-viewer').classList.remove('hidden');}else{alert('Cette story a expiré ou a été supprimée.');}}catch(e){alert('Story introuvable.');}};

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
  var ts=document.getElementById('prof-teacher-section');
  if(ts){if(cu.role==='enseignant'||cu.activeRole==='enseignant'||(cu.roles&&cu.roles.indexOf('enseignant')!==-1)){ts.classList.remove('hidden');
    var bio=document.getElementById('prof-bio');if(bio)bio.value=cu.bio||'';
    renderCatAccordion(cu);
    renderChips('prof-publics-grid',['Enfants','Adultes','Femmes','Hommes'],cu.publics||[],'prof-pub');
  }else ts.classList.add('hidden');}
  var rm=document.getElementById('roles-manager');if(rm){rm.innerHTML='';(cu.roles||[cu.role]).forEach(function(r){var isAct=r===(cu.activeRole||cu.role);rm.innerHTML+='<div class="role-card'+(isAct?' active':'')+'" onclick="switchProfileRole(\''+r+'\')" style="cursor:pointer;">'+r+(isAct?' ✓':'')+'</div>';});}
  // My posts
  var mp=document.getElementById('my-posts');if(mp){
    mp.innerHTML='<p class="text-muted text-center">Chargement des publications...</p>';
    try{
      var posts=await fbGetUserPosts(cu.id);mp.innerHTML='';
      if(posts.length===0)mp.innerHTML='<p class="empty-msg">Aucune publication.</p>';
      else for(var i=0;i<posts.length;i++)mp.innerHTML+=renderPostCard(posts[i],cu);
      var pc=document.getElementById('prof-posts-count');if(pc)pc.textContent=posts.length;
    }catch(err){console.error('Erreur chargement publications:',err);mp.innerHTML='<p class="empty-msg" style="color:red;">Erreur de chargement des publications.</p>';}
  }
}
function renderChips(cid,opts,sel,pfx){var c=document.getElementById(cid);if(!c)return;c.innerHTML='';for(var i=0;i<opts.length;i++){var ch=sel.indexOf(opts[i])!==-1?'checked':'';c.innerHTML+='<label class="chip-check"><input type="checkbox" class="'+pfx+'" value="'+opts[i]+'" '+ch+'> '+opts[i]+'</label>';}}
window.saveProfile=async function(){var cu=getSession();if(!cu)return;var data={};data.name=(document.getElementById('prof-name-input')||{}).value||cu.name;data.city=(document.getElementById('prof-city-input')||{}).value||cu.city;if(cu.role==='enseignant'||(cu.roles&&cu.roles.indexOf('enseignant')!==-1)){data.bio=(document.getElementById('prof-bio')||{}).value||'';data.categories=[];document.querySelectorAll('.prof-cat:checked').forEach(function(c){data.categories.push(c.value);});data.disciplines=[];document.querySelectorAll('.prof-disc:checked').forEach(function(c){data.disciplines.push(c.value);});data.publics=[];document.querySelectorAll('.prof-pub:checked').forEach(function(c){data.publics.push(c.value);});}await fbSetUser(cu.id,data);Object.assign(cu,data);setSession(cu);alert("Profil enregistré !");setupNav(cu);loadProfile();};
window.uploadAvatar=async function(input){if(!input.files||!input.files[0])return;var cu=getSession();if(!cu)return;var reader=new FileReader();reader.onload=async function(e){await fbSetUser(cu.id,{avatar:e.target.result});cu.avatar=e.target.result;setSession(cu);setupNav(cu);loadProfile();};reader.readAsDataURL(input.files[0]);};

// ===== FAVORITES =====
window._favTab='profiles';
window.switchFavTab=function(tab){window._favTab=tab;document.querySelectorAll('.fav-tab').forEach(function(t){t.classList.remove('active');});event.target.classList.add('active');loadFavorites();};
async function loadFavorites(){
  var cu=getSession();if(!cu)return;var fc=document.getElementById('fav-content');if(!fc)return;
  fc.innerHTML='<p class="text-muted text-center">Chargement...</p>';
  var favs=await fbGetFavorites(cu.id);fc.innerHTML='';
  var targetType=window._favTab==='profiles'?'profile':'post';
  var filtered=favs.filter(function(f){return f.type===targetType;});
  if(filtered.length===0){fc.innerHTML='<p class="empty-msg">Aucun favori dans cette catégorie.</p>';return;}
  if(window._favTab==='profiles'){
    for(var i=0;i<filtered.length;i++){var u=await fbGetUser(filtered[i].id);if(!u)continue;
      var av=u.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(u.name)+'&background=0d6e4e&color=fff&size=60';
      fc.innerHTML+='<div class="suggest-card" onclick="viewUserProfile(\''+u.id+'\')"><img src="'+av+'"><h4>'+sanitize(u.name)+'</h4><p>'+sanitize(u.city||'')+'</p><button class="btn-sm" onclick="event.stopPropagation();fbRemoveFavorite(\''+cu.id+'\',\''+u.id+'\').then(loadFavorites)"><i class="fa-solid fa-trash"></i></button></div>';
    }
  }else{
    for(var i=0;i<filtered.length;i++){
      var p=null;try{var doc=await db.collection('posts').doc(filtered[i].id).get();if(doc.exists){p=doc.data();p.id=doc.id;}}catch(e){}
      if(!p)continue;fc.innerHTML+=renderPostCard(p,cu);
    }
  }
}

// ===== NOTIFICATIONS =====
async function loadNotifications(){var cu=getSession();if(!cu)return;var nl=document.getElementById('notifications-list');if(!nl)return;nl.innerHTML='<p class="empty-msg">Chargement...</p>';var notifs=await fbGetNotifications(cu.id);if(notifs.length===0){nl.innerHTML='<p class="empty-msg">Aucune notification.</p>';return;}nl.innerHTML='';for(var i=0;i<notifs.length;i++){var n=notifs[i];nl.innerHTML+='<div class="notif-item'+(n.read?'':' unread')+'"><div class="notif-icon"><i class="fa-solid '+(n.icon||'fa-bell')+'"></i></div><div class="notif-content"><p>'+sanitize(n.text)+'</p><small>'+new Date(n.timestamp).toLocaleDateString('fr')+'</small></div></div>';}}

// ===== ADMIN =====
window.loadAdminData=async function(){
  var users=await fbGetAllUsers();var as=document.getElementById('admin-stats');
  if(as){var tc=0,sc=0;for(var i=0;i<users.length;i++){if(users[i].role==='enseignant')tc++;else if(users[i].role!=='admin')sc++;}
    as.innerHTML='<div class="stat-card"><i class="fa-solid fa-users"></i><div><span class="stat-num">'+(tc+sc)+'</span><span class="stat-label">Total</span></div></div><div class="stat-card"><i class="fa-solid fa-chalkboard-user"></i><div><span class="stat-num">'+tc+'</span><span class="stat-label">Enseignants</span></div></div><div class="stat-card"><i class="fa-solid fa-user-graduate"></i><div><span class="stat-num">'+sc+'</span><span class="stat-label">Apprenants</span></div></div>';}
  var tb=document.getElementById('admin-tbody');if(!tb)return;tb.innerHTML='';
  for(var i=0;i<users.length;i++){var u=users[i];if(u.role==='admin')continue;
    var sb=u.status==='active'?'<span class="status-badge status-active">Actif</span>':u.status==='pending'?'<span class="status-badge status-pending">En attente</span>':'<span class="status-badge status-blocked">Bloqué</span>';
    var btns='';
    if(u.status!=='active')btns+='<button class="btn-success" style="margin:2px;" onclick="adminSetStatus(\''+u.id+'\',\'active\')">Activer</button>';
    if(u.status!=='blocked')btns+='<button class="btn-danger" style="margin:2px;" onclick="adminSetStatus(\''+u.id+'\',\'blocked\')">Bloquer</button>';
    btns+='<button class="btn-danger" style="margin:2px;opacity:.7;" onclick="adminDeleteUser(\''+u.id+'\')"><i class="fa-solid fa-trash"></i></button>';
    tb.innerHTML+='<tr><td>'+sanitize(u.name)+'</td><td>'+(u.role||'')+'</td><td>'+sanitize(u.phone)+'</td><td>'+sanitize(u.city||'')+'</td><td>'+sb+'</td><td>'+btns+'</td></tr>';}
};
window.adminSetStatus=async function(uid,s){await fbSetUser(uid,{status:s});await loadAdminData();};

window.adminDeleteUser=async function(uid){if(!confirm('Supprimer ?'))return;await fbDeleteUser(uid);alert('Supprimé.');await loadAdminData();};
window.adminBroadcastMessage=async function(){
  var msg=prompt('Entrez le message collectif à envoyer à tous les utilisateurs :');
  if(!msg||!msg.trim())return;
  var cu=getSession();if(!cu)return;
  var users=await fbGetAllUsers();
  var count=0;
  for(var i=0;i<users.length;i++){
    var u=users[i];
    if(u.id===cu.id||u.role==='admin')continue;
    try{
      // Créer ou récupérer la conversation avec cet utilisateur
      var conv=await fbGetOrCreateConversation(cu.id,u.id);
      // Envoyer le message
      await fbSendMessage(conv.id,{
        text:'📢 '+msg,
        senderId:cu.id,
        recipientId:u.id,
        timestamp:new Date().toISOString(),
        type:'text'
      });
      // Ajouter une notification
      await fbAddNotification(u.id,{
        text:'📢 Message de l\'administrateur : '+msg.substring(0,80)+(msg.length>80?'...':''),
        icon:'fa-bullhorn',
        type:'broadcast'
      });
      count++;
    }catch(e){console.error('Erreur envoi à',u.name,e);}
  }
  alert('Message envoyé à '+count+' utilisateur'+(count>1?'s':'')+'.');
};

// ===== UNREAD BADGE COUNTER =====
var unreadBadgeListener=null;
function startUnreadBadgeListener(){
  var cu=getSession();if(!cu)return;
  if(unreadBadgeListener)unreadBadgeListener();
  unreadBadgeListener=fbListenConversations(cu.id,function(convs){
    var total=0;
    for(var i=0;i<convs.length;i++){var c=convs[i];if(c.unread&&c.unread[cu.id])total+=c.unread[cu.id];}
    ['msg-badge','msg-badge-mobile'].forEach(function(id){var el=document.getElementById(id);if(el){if(total>0){el.textContent=total>99?'99+':total;el.classList.remove('hidden');}else{el.classList.add('hidden');}}});
    var nb=document.getElementById('notif-badge');if(nb){if(total>0){nb.textContent=total>99?'99+':total;nb.classList.remove('hidden');}else{nb.classList.add('hidden');}}
  });
}

// ===== PROFILE CATEGORY ACCORDION =====
function renderCatAccordion(cu){
  var container=document.getElementById('prof-cat-accordion');if(!container)return;container.innerHTML='';
  var selCats=cu.categories||[];var selDiscs=cu.disciplines||[];
  Object.keys(CATEGORIES).forEach(function(k){
    var c=CATEGORIES[k];var isCatSel=selCats.indexOf(k)!==-1;
    var discHtml='';c.disciplines.forEach(function(d){var ch=selDiscs.indexOf(d)!==-1?'checked':'';discHtml+='<label class="chip-check"><input type="checkbox" class="prof-disc" value="'+d+'" '+ch+'> '+d+'</label>';});
    container.innerHTML+='<div class="cat-accordion-item"><div class="cat-accordion-header" onclick="toggleCatAccordion(this)"><div style="display:flex;align-items:center;gap:8px;"><input type="checkbox" class="cat-check prof-cat" value="'+k+'" '+(isCatSel?'checked':'')+' onclick="event.stopPropagation()"><span>'+k+'</span></div><i class="fa-solid fa-chevron-down"></i></div><div class="cat-accordion-body"><div class="chip-grid">'+discHtml+'</div></div></div>';
  });
}
window.toggleCatAccordion=function(header){
  header.classList.toggle('open');
  var body=header.nextElementSibling;if(body)body.classList.toggle('open');
};

// ===== LANGUAGE SYSTEM =====
var LANGS={fr:{hero_sub:'La plateforme éducative qui connecte enseignants et apprenants.',find_teacher:'Trouver un enseignant',categories:'Catégories',news_feed:"Fil d'actualité",discover_teachers:'Enseignants à découvrir'},en:{hero_sub:'The educational platform connecting teachers and learners.',find_teacher:'Find a teacher',categories:'Categories',news_feed:'News Feed',discover_teachers:'Teachers to discover'},ar:{hero_sub:'المنصة التعليمية التي تربط المعلمين والمتعلمين.',find_teacher:'ابحث عن معلم',categories:'الفئات',news_feed:'آخر الأخبار',discover_teachers:'معلمون للاكتشاف'}};
var LANG_ORDER=['fr','en','ar'];
window.cycleLang=function(){
  var cur=localStorage.getItem('tla_lang')||'fr';
  var idx=LANG_ORDER.indexOf(cur);var next=LANG_ORDER[(idx+1)%LANG_ORDER.length];
  localStorage.setItem('tla_lang',next);applyLang(next);
  var lb=document.getElementById('lang-btn');if(lb)lb.title=next.toUpperCase();
};
function applyLang(lang){
  var t=LANGS[lang]||LANGS.fr;
  document.querySelectorAll('[data-i18n]').forEach(function(el){var key=el.getAttribute('data-i18n');if(t[key])el.textContent=t[key];});
  if(lang==='ar')document.body.style.direction='rtl';else document.body.style.direction='ltr';
}
setTimeout(function(){applyLang(localStorage.getItem('tla_lang')||'fr');},600);

