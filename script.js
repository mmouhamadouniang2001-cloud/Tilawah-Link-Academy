window.onerror=function(msg,s,l){document.body.innerHTML='<div style="background:red;color:white;padding:20px"><h2>Erreur</h2><p>'+msg+'</p><p>Ligne: '+l+'</p></div>'+document.body.innerHTML;};
window.onunhandledrejection=function(e){alert('Erreur: '+e.reason);};
document.addEventListener("DOMContentLoaded",async function(){try{await initFirebaseDB();await refreshInterface();}catch(e){alert('Erreur Firebase: '+e.message);console.error(e);}});
function hideAllViews(){var ids=['view-auth','view-payment','view-platform','view-admin','page-main-content','page-profile','page-teachers'];for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]);if(el)el.classList.add('hidden');}var m=document.getElementById('teacher-modal');if(m)m.classList.add('hidden');}

window.refreshInterface=async function(){
  hideAllViews();var user=getSession();
  if(!user){document.getElementById('view-auth').classList.remove('hidden');switchAuth('login');return;}
  var fresh=await fbGetUser(user.id);if(fresh){user=fresh;setSession(user);}
  if(user.needsPasswordChange){document.getElementById('view-auth').classList.remove('hidden');switchAuth('force-pass');return;}
  if(user.role==='admin'){document.getElementById('view-admin').classList.remove('hidden');await loadAdminData();return;}
  if(user.role==='enseignant'){
    if(user.paymentDate){var d=Math.floor((new Date()-new Date(user.paymentDate))/(864e5));if(d>=30&&user.paymentStatus!=='awaiting'){user.paymentStatus='expired';await fbSetUser(user.id,{paymentStatus:'expired'});setSession(user);}}
    if(user.status==='pending'||user.paymentStatus==='expired'){document.getElementById('view-payment').classList.remove('hidden');showPayScreen(user);return;}
    if(user.paymentStatus==='awaiting'){document.getElementById('view-payment').classList.remove('hidden');showWaitingScreen();return;}
  }
  if(user.status==='blocked'){alert('Votre compte a été bloqué.');appLogout();return;}
  document.getElementById('view-platform').classList.remove('hidden');showMainPage();
  var wm=document.getElementById('hero-welcome-msg');if(wm)wm.innerHTML='Bienvenue <strong>'+user.name+'</strong> sur <strong>Tilawah Link Academy</strong>, votre espace dédié à l\'apprentissage et à l\'enseignement islamique.';
  var ab=document.getElementById('admin-panel-btn');if(ab){if(user.role==='admin')ab.classList.remove('hidden');else ab.classList.add('hidden');}
  var eb=document.getElementById('nav-espace-btn'),pb=document.getElementById('nav-profile-btn');
  if(user.role==='enseignant'){if(eb)eb.classList.remove('hidden');if(pb)pb.classList.add('hidden');}else{if(eb)eb.classList.add('hidden');if(pb)pb.classList.remove('hidden');}
};
function showPayScreen(u){var sp=document.getElementById('pay-screen-pay'),sw=document.getElementById('pay-screen-waiting');if(sp)sp.classList.remove('hidden');if(sw)sw.classList.add('hidden');var t=document.getElementById('pay-title'),m=document.getElementById('pay-msg');if(u.paymentStatus==='expired'){if(t)t.textContent='Renouvellement de votre abonnement';if(m)m.innerHTML='Votre abonnement a expiré. Renouvelez <strong>1 000 FCFA</strong> via Wave.';}else{if(t)t.textContent='Activation de votre compte';if(m)m.innerHTML='Effectuez votre paiement de <strong>1 000 FCFA</strong> via Wave.';}}
function showWaitingScreen(){var sp=document.getElementById('pay-screen-pay'),sw=document.getElementById('pay-screen-waiting');if(sp)sp.classList.add('hidden');if(sw)sw.classList.remove('hidden');}
window.confirmPayment=async function(){var u=getSession();if(!u)return;u.paymentStatus='awaiting';await fbSetUser(u.id,{paymentStatus:'awaiting'});setSession(u);showWaitingScreen();var r=u.paymentDate?'renouvellement':'première inscription';var wa=encodeURIComponent('Salam Cher Administrateur,\n\nJe suis '+u.name+' ('+u.phone+'), enseignant sur Tilawah Link Academy.\n\nPaiement 1 000 FCFA pour mon '+r+'.\n\nMerci de valider.\n\nBarakAllahu fik.');window.open('https://wa.me/221774599835?text='+wa,'_blank');};
window.updateStats=async function(){var users=await fbGetAllUsers();var t=0,s=0;for(var i=0;i<users.length;i++){if(users[i].role==='enseignant')t++;else if(users[i].role==='apprenant')s++;}var st=document.getElementById('stat-teachers');if(st)st.textContent=t;var ss=document.getElementById('stat-students');if(ss)ss.textContent=s;var tt=document.getElementById('stat-total');if(tt)tt.textContent=t+s;};
window.goToPlatform=async function(){document.getElementById('view-admin').classList.add('hidden');document.getElementById('view-platform').classList.remove('hidden');var ab=document.getElementById('admin-panel-btn');if(ab)ab.classList.remove('hidden');var u=getSession();var wm=document.getElementById('hero-welcome-msg');if(wm&&u)wm.innerHTML='Bienvenue <strong>'+u.name+'</strong> sur <strong>Tilawah Link Academy</strong>';var eb=document.getElementById('nav-espace-btn'),pb=document.getElementById('nav-profile-btn');if(eb)eb.classList.add('hidden');if(pb)pb.classList.remove('hidden');showMainPage();};
window.toggleMobileMenu=function(){var n=document.getElementById('nav-center');if(n)n.classList.toggle('open');};
window.closeMobileMenu=function(){var n=document.getElementById('nav-center');if(n)n.classList.remove('open');};
window.goToAdmin=async function(){document.getElementById('view-platform').classList.add('hidden');document.getElementById('view-admin').classList.remove('hidden');await loadAdminData();};
window.showMainPage=function(){document.getElementById('page-profile').classList.add('hidden');var pt=document.getElementById('page-teachers');if(pt)pt.classList.add('hidden');document.getElementById('page-main-content').classList.remove('hidden');var nl=document.getElementById('platform-nav-links');if(nl)nl.classList.remove('hidden');};
window.showTeachersPage=async function(){document.getElementById('page-main-content').classList.add('hidden');document.getElementById('page-profile').classList.add('hidden');var pt=document.getElementById('page-teachers');if(pt)pt.classList.remove('hidden');var nl=document.getElementById('platform-nav-links');if(nl)nl.classList.remove('hidden');await renderTeachersList();window.scrollTo({top:0,behavior:'smooth'});};
window.goToSection=function(sid){if(sid==='enseignants'){showTeachersPage();return;}document.getElementById('page-profile').classList.add('hidden');var pt=document.getElementById('page-teachers');if(pt)pt.classList.add('hidden');document.getElementById('page-main-content').classList.remove('hidden');setTimeout(function(){var t=document.getElementById(sid);if(t){window.scrollTo({top:t.getBoundingClientRect().top+window.pageYOffset-70,behavior:'smooth'});}},100);};
window.navToProfile=async function(){document.getElementById('page-main-content').classList.add('hidden');var pt=document.getElementById('page-teachers');if(pt)pt.classList.add('hidden');document.getElementById('page-profile').classList.remove('hidden');await fillProfileForm();};
window.switchAuth=function(id){var s=['login','register','forgot','force-pass'];for(var i=0;i<s.length;i++)document.getElementById('auth-'+s[i]).classList.add('hidden');document.getElementById('auth-'+id).classList.remove('hidden');};
window.selectRole=function(r){document.getElementById('btn-role-apprenant').className='role-btn';document.getElementById('btn-role-enseignant').className='role-btn';document.getElementById('btn-role-'+r).className='role-btn active';document.getElementById('reg-role').value=r;if(r==='enseignant')document.getElementById('enseignant-options').classList.remove('hidden');else document.getElementById('enseignant-options').classList.add('hidden');};
window.appRegister=async function(){var role=document.getElementById('reg-role').value,name=document.getElementById('reg-name').value.trim(),phone=document.getElementById('reg-phone').value.trim(),city=document.getElementById('reg-city').value.trim(),pass=document.getElementById('reg-pass').value;if(!name||!phone||!city||!pass){alert("Remplissez tous les champs.");return;}var specs=[],pubs=[];if(role==='enseignant'){var sc=document.querySelectorAll('.reg-spec:checked');for(var i=0;i<sc.length;i++)specs.push(sc[i].value);var pc=document.querySelectorAll('.reg-public:checked');for(var i=0;i<pc.length;i++)pubs.push(pc[i].value);if(specs.length===0){alert("Choisissez au moins une spécialité.");return;}}var ex=await fbFindByPhone(phone);if(ex){alert("Numéro déjà inscrit.");return;}var u={id:'u_'+Date.now(),role:role,name:name,phone:phone,city:city,password:pass,status:(role==='enseignant'?'pending':'active'),specs:specs,publics:pubs,bio:'',avatar:'',paymentStatus:'',paymentDate:''};await fbSetUser(u.id,u);setSession(u);await refreshInterface();};
window.appLogin=async function(){var id=document.getElementById('login-id').value.trim(),pass=document.getElementById('login-pass').value;if(!id||!pass){alert("Remplissez vos identifiants.");return;}var found=await fbFindByLogin(id,pass);if(found){if(found.status==='blocked'){alert("Compte bloqué.");return;}setSession(found);await refreshInterface();}else{alert("Identifiants incorrects.");}};
window.appForgotPass=async function(){var phone=document.getElementById('forgot-phone').value.trim();var u=await fbFindByPhone(phone);if(u){alert("Code '1234' envoyé au "+phone);await fbSetUser(u.id,{password:'1234',needsPasswordChange:true});switchAuth('login');}else{alert("Numéro introuvable.");}};
window.appForcePassChange=async function(){var np=document.getElementById('force-new-pass').value;if(np.length<4){alert("Trop court.");return;}var cu=getSession();await fbSetUser(cu.id,{password:np,needsPasswordChange:false});cu.password=np;cu.needsPasswordChange=false;setSession(cu);await refreshInterface();};
window.appLogout=function(){clearSession();refreshInterface();};
window.proceedToProfileSetup=function(){document.getElementById('view-payment').classList.add('hidden');document.getElementById('view-platform').classList.remove('hidden');document.getElementById('platform-nav-links').classList.add('hidden');var eb=document.getElementById('nav-espace-btn');if(eb)eb.classList.remove('hidden');navToProfile();};
// Part 2: Teachers, Profile, Media, Admin
window.renderTeachersList=async function(){
  var container=document.getElementById('teachers-list-container');if(!container)return;container.innerHTML='<p class="w-100 text-center">Chargement...</p>';
  var ci=document.getElementById('search-city'),si=document.getElementById('search-spec'),pi=document.getElementById('search-public');
  var sc=ci?ci.value.toLowerCase():'',ss=si?si.value:'',sp=pi?pi.value:'';
  var users=await fbGetAllUsers();var allMedia=await fbGetAllMedia();var cu=getSession();container.innerHTML='';var count=0;
  for(var i=0;i<users.length;i++){var u=users[i];if(u.role!=='enseignant'||u.status!=='active')continue;
    if(sc&&(!u.city||u.city.toLowerCase().indexOf(sc)===-1))continue;
    if(ss&&(!u.specs||u.specs.indexOf(ss)===-1))continue;
    if(sp&&(!u.publics||u.publics.indexOf(sp)===-1))continue;count++;
    var div=document.createElement('div');div.className='teacher-card';
    var av=u.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(u.name)+'&background=1a3a6b&color=fff&size=150';
    var spH='';if(u.specs)for(var s=0;s<u.specs.length;s++)spH+='<span class="badge">'+u.specs[s]+'</span>';
    var puH='';if(u.publics)for(var p=0;p<u.publics.length;p++)puH+='<span class="public-badge">'+u.publics[p]+'</span>';
    var bioH=u.bio?'<p class="teacher-bio">"'+u.bio.substring(0,100)+(u.bio.length>100?'...':'')+'"</p>':'';
    var mc=0;for(var m=0;m<allMedia.length;m++){if(allMedia[m].userId===u.id)mc++;}
    var mn=mc>0?'<p class="text-sm" style="margin-bottom:8px;"><i class="fa-solid fa-images"></i> '+mc+' média(s)</p>':'';
    var waMsg=encodeURIComponent("Salam, je vous contacte via Tilawah Link Academy. Je suis "+((cu&&cu.name)?cu.name:"un apprenant")+".");
    var waUrl="https://wa.me/"+(u.phone||"").replace(/[\+\s]/g,'')+"?text="+waMsg;
    div.innerHTML='<div class="teacher-avatar"><img src="'+av+'"></div><div class="teacher-info"><h3>'+u.name+'</h3><p class="text-sm mb-3"><i class="fa-solid fa-location-dot"></i> '+(u.city||'')+'</p><div class="specs-badges">'+spH+'</div><div class="specs-badges" style="margin-bottom:8px;">'+puH+'</div>'+bioH+mn+'<button class="btn btn-primary w-100" style="margin-bottom:8px;" onclick="openTeacherModal(\''+u.id+'\')"><i class="fa-solid fa-eye"></i> Profil complet</button><a href="'+waUrl+'" target="_blank" class="btn btn-whatsapp w-100"><i class="fa-brands fa-whatsapp"></i> Contacter</a></div>';
    container.appendChild(div);}
  if(count===0)container.innerHTML='<p class="w-100 text-center mt-4">Aucun enseignant trouvé.</p>';
};
window.openTeacherModal=async function(tid){
  var t=await fbGetUser(tid);if(!t)return;var allMedia=await fbGetAllMedia();var cu=getSession();
  var av=t.avatar||'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background=1a3a6b&color=fff&size=200';
  var spH='';if(t.specs)for(var s=0;s<t.specs.length;s++)spH+='<span class="badge">'+t.specs[s]+'</span> ';
  var puH='';if(t.publics)for(var p=0;p<t.publics.length;p++)puH+='<span class="public-badge">'+t.publics[p]+'</span> ';
  var waMsg=encodeURIComponent("Salam, je vous contacte via Tilawah Link Academy. Je suis "+((cu&&cu.name)?cu.name:"un apprenant")+".");
  var waUrl="https://wa.me/"+(t.phone||"").replace(/[\+\s]/g,'')+"?text="+waMsg;
  var body=document.getElementById('teacher-modal-body');
  var hasMedia=false;for(var m=0;m<allMedia.length;m++){if(allMedia[m].userId===t.id){hasMedia=true;break;}}
  body.innerHTML='<button class="modal-close" onclick="closeTeacherModal()">&times;</button>'
    +'<div class="text-center"><img src="'+av+'" style="width:150px;height:150px;border-radius:50%;object-fit:cover;border:5px solid var(--primary);margin-bottom:20px;"></div>'
    +'<h2 class="text-center" style="margin-bottom:5px;">'+t.name+'</h2>'
    +'<p class="text-center text-sm mb-3"><i class="fa-solid fa-location-dot"></i> '+(t.city||'')+'</p>'
    +'<div class="text-center mb-3">'+spH+'</div>'+(puH?'<div class="text-center mb-3">'+puH+'</div>':'')
    +(t.bio?'<div style="background:var(--bg);padding:20px;border-radius:15px;margin-bottom:20px;"><h4 style="margin-bottom:10px;">📝 Présentation</h4><p style="white-space:pre-wrap;">'+t.bio+'</p></div>':'')
    +(hasMedia?'<h4 style="margin-bottom:10px;">📸 Galerie</h4><div id="modal-gallery-items" class="modal-gallery"></div>':'')
    +'<a href="'+waUrl+'" target="_blank" class="btn btn-whatsapp w-100 mt-4" style="display:flex;align-items:center;justify-content:center;gap:10px;font-size:1.1rem;padding:15px;"><i class="fa-brands fa-whatsapp"></i> Contacter sur WhatsApp</a>';
  if(hasMedia){var gc=document.getElementById('modal-gallery-items');for(var m=0;m<allMedia.length;m++){if(allMedia[m].userId===t.id){(function(media){fbGetFileUrl(media.id).then(function(url){if(!url||!gc)return;if(media.type&&media.type.startsWith('video/')){var v=document.createElement('video');v.src=url;v.controls=true;v.style.maxWidth='100%';v.style.borderRadius='12px';gc.appendChild(v);}else{var img=document.createElement('img');img.src=url;img.style.maxWidth='100%';img.style.borderRadius='12px';gc.appendChild(img);}});})(allMedia[m]);}}}
  document.getElementById('teacher-modal').classList.remove('hidden');
};
window.closeTeacherModal=function(){document.getElementById('teacher-modal').classList.add('hidden');};
window.fillProfileForm=async function(){
  var cu=getSession();if(!cu)return;
  var ensH=document.getElementById('espace-ens-header'),appH=document.getElementById('espace-app-header'),pw=document.getElementById('profile-warning'),pa=document.getElementById('profile-active');
  if(cu.role==='enseignant'){if(ensH)ensH.classList.remove('hidden');if(appH)appH.classList.add('hidden');document.getElementById('profile-teacher-options').classList.remove('hidden');if(cu.status==='pending'){if(pw)pw.classList.remove('hidden');if(pa)pa.classList.add('hidden');}else{if(pw)pw.classList.add('hidden');if(pa)pa.classList.remove('hidden');}document.getElementById('my-bio').value=cu.bio||'';var cbs=document.querySelectorAll('.prof-spec');for(var i=0;i<cbs.length;i++)cbs[i].checked=cu.specs&&cu.specs.indexOf(cbs[i].value)!==-1;await renderMyGallery();}else{if(ensH)ensH.classList.add('hidden');if(appH)appH.classList.remove('hidden');document.getElementById('profile-teacher-options').classList.add('hidden');}
  if(cu.avatar)document.getElementById('my-avatar-preview').src=cu.avatar;
};
window.saveMyProfile=async function(){
  var cu=getSession();if(!cu)return;var data={};
  if(cu.role==='enseignant'){data.bio=document.getElementById('my-bio').value;var ns=[];var cbs=document.querySelectorAll('.prof-spec:checked');for(var i=0;i<cbs.length;i++)ns.push(cbs[i].value);data.specs=ns;}
  var fi=document.getElementById('my-avatar-input');
  if(fi.files.length>0){var reader=new FileReader();reader.onload=async function(e){data.avatar=e.target.result;await fbSetUser(cu.id,data);Object.assign(cu,data);setSession(cu);alert("Profil enregistré !");await fillProfileForm();};reader.readAsDataURL(fi.files[0]);}
  else{await fbSetUser(cu.id,data);Object.assign(cu,data);setSession(cu);alert("Profil enregistré !");}
};
window.uploadMediaToGallery=async function(){
  var cu=getSession();var fi=document.getElementById('my-gallery-upload');if(fi.files.length===0)return;
  var file=fi.files[0];var maxSize=file.type.startsWith('video/')?1073741824:104857600;
  if(file.size>maxSize){alert('Fichier trop volumineux.');return;}
  var mid='m_'+Date.now();var url=await fbUploadFile(mid,file);
  await fbAddMedia(mid,{id:mid,userId:cu.id,type:file.type,url:url});
  fi.value='';await renderMyGallery();
};
async function renderMediaItem(mid,mtype,container,showDel,extra){
  var url=await fbGetFileUrl(mid);if(!url)return;
  var div=document.createElement('div');div.className='media-item';if(extra){div.style.height='auto';div.style.paddingBottom='30px';}
  if(mtype&&mtype.startsWith('video/')){var v=document.createElement('video');v.src=url;v.controls=true;v.style.width='100%';v.style.height=extra?'120px':'100%';v.style.objectFit='cover';div.appendChild(v);}
  else{var img=document.createElement('img');img.src=url;img.style.width='100%';img.style.height=extra?'120px':'100%';img.style.objectFit='cover';div.appendChild(img);}
  if(showDel){var btn=document.createElement('button');btn.className='delete-media-btn';btn.innerHTML='<i class="fa-solid fa-trash"></i>';btn.onclick=function(){deleteMedia(mid);};div.appendChild(btn);}
  if(extra)div.insertAdjacentHTML('beforeend',extra);container.appendChild(div);
}
window.renderMyGallery=async function(){
  var cu=getSession();var allMedia=await fbGetAllMedia();
  var c=document.getElementById('my-gallery-container');if(!c)return;c.innerHTML='';
  for(var i=0;i<allMedia.length;i++){if(allMedia[i].userId===cu.id)await renderMediaItem(allMedia[i].id,allMedia[i].type,c,true,null);}
};
window.deleteMedia=async function(mid){
  if(!confirm('Supprimer ?'))return;await fbDeleteFile(mid);await fbDeleteMedia(mid);
  var cu=getSession();if(cu&&cu.role==='admin')await loadAdminData();else await renderMyGallery();
};
window.loadAdminData=async function(){
  var users=await fbGetAllUsers();var allMedia=await fbGetAllMedia();await updateStats();
  var tb=document.getElementById('admin-table-body');if(!tb)return;tb.innerHTML='';
  for(var i=0;i<users.length;i++){var u=users[i];if(u.role==='admin')continue;
    var sb='';if(u.status==='active')sb='<span class="status-badge status-active">Actif</span>';else if(u.status==='pending')sb='<span class="status-badge status-pending">En attente</span>';else sb='<span class="status-badge status-blocked">Bloqué</span>';
    var payInfo='—';if(u.role==='enseignant'){if(u.paymentStatus==='awaiting')payInfo='<span class="status-badge" style="background:#fff3cd;color:#856404;">💰 Signalé</span>';else if(u.paymentStatus==='expired')payInfo='<span class="status-badge status-blocked">⏰ Expiré</span>';else if(u.paymentDate)payInfo='<span class="status-badge status-active">✅ Payé</span>';else payInfo='<span class="status-badge status-pending">Non payé</span>';}
    var btns='';if(u.role==='enseignant'&&u.paymentStatus==='awaiting')btns+='<button class="btn btn-success" style="padding:5px 10px;font-size:.8rem;margin:2px;" onclick="adminValidatePayment(\''+u.id+'\')"><i class="fa-solid fa-check"></i> Valider paiement</button>';
    if(u.status!=='active')btns+='<button class="btn btn-success" style="padding:5px 10px;font-size:.8rem;margin:2px;" onclick="adminSetStatus(\''+u.id+'\',\'active\')">Activer</button>';
    if(u.status!=='blocked')btns+='<button class="btn btn-danger" style="padding:5px 10px;font-size:.8rem;margin:2px;" onclick="adminSetStatus(\''+u.id+'\',\'blocked\')">Bloquer</button>';
    btns+='<button class="btn" style="padding:5px 10px;font-size:.8rem;margin:2px;background:#6c757d;color:white;" onclick="adminDeleteUser(\''+u.id+'\')"><i class="fa-solid fa-trash"></i> Supprimer</button>';
    var tr=document.createElement('tr');tr.innerHTML='<td>'+u.name+'</td><td>'+(u.role||'').toUpperCase()+'</td><td>'+u.phone+'</td><td>'+(u.city||'')+'</td><td>'+sb+'</td><td>'+payInfo+'</td><td>'+btns+'</td>';tb.appendChild(tr);}
  var gb=document.getElementById('admin-gallery-body');if(!gb)return;gb.innerHTML='';
  if(allMedia.length===0){gb.innerHTML='<p>Aucun média.</p>';return;}
  for(var m=0;m<allMedia.length;m++){var media=allMedia[m],own='?';for(var j=0;j<users.length;j++){if(users[j].id===media.userId)own=users[j].name;}var ex='<p style="font-size:.7rem;color:white;text-align:center;padding:3px;position:absolute;bottom:0;width:100%;background:rgba(0,0,0,.5);">'+own+'</p>';await renderMediaItem(media.id,media.type,gb,true,ex);}
};
window.adminSetStatus=async function(uid,ns){await fbSetUser(uid,{status:ns});await loadAdminData();};
window.adminValidatePayment=async function(uid){await fbSetUser(uid,{paymentStatus:'paid',paymentDate:new Date().toISOString(),status:'active'});alert('Paiement validé ! Accès 30 jours.');await loadAdminData();};
window.adminDeleteUser=async function(uid){if(!confirm('Supprimer ce compte ?'))return;var allMedia=await fbGetAllMedia();for(var m=0;m<allMedia.length;m++){if(allMedia[m].userId===uid){await fbDeleteFile(allMedia[m].id);await fbDeleteMedia(allMedia[m].id);}}await fbDeleteUser(uid);alert('Compte supprimé.');await loadAdminData();};
