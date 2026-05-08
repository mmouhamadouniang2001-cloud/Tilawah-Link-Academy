// Tilawah Link Academy - JS (Blue Theme + IndexedDB Media)

window.onerror=function(msg,s,l){document.body.innerHTML='<div style="background:red;color:white;padding:20px;text-align:center;"><h2>Erreur</h2><p>'+msg+'</p><p>Ligne: '+l+'</p></div>'+document.body.innerHTML;return false;};
function dbGet(k,d){try{var r=localStorage.getItem(k);if(r===null||r==="undefined")return d;return JSON.parse(r);}catch(e){return d;}}
function dbSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

// === IndexedDB pour stocker les fichiers médias (vidéos/images) ===
var mediaDB=null;
function openMediaDB(cb){
    if(mediaDB){cb(mediaDB);return;}
    var req=indexedDB.open('TLA_MediaDB',1);
    req.onupgradeneeded=function(e){e.target.result.createObjectStore('blobs');};
    req.onsuccess=function(e){mediaDB=e.target.result;cb(mediaDB);};
    req.onerror=function(){alert('Erreur IndexedDB');};
}
function saveBlob(id,blob,cb){
    openMediaDB(function(db){
        var tx=db.transaction('blobs','readwrite');
        tx.objectStore('blobs').put(blob,id);
        tx.oncomplete=function(){if(cb)cb();};
    });
}
function getBlob(id,cb){
    openMediaDB(function(db){
        var req=db.transaction('blobs').objectStore('blobs').get(id);
        req.onsuccess=function(){cb(req.result||null);};
        req.onerror=function(){cb(null);};
    });
}
function delBlob(id,cb){
    openMediaDB(function(db){
        var tx=db.transaction('blobs','readwrite');
        tx.objectStore('blobs').delete(id);
        tx.oncomplete=function(){if(cb)cb();};
    });
}

function initDB(){
    var users=dbGet('tla_users',null);
    if(!users||users.length===0){
        users=[{id:'admin',role:'admin',name:'Propriétaire',email:'admin@tilawahlink.academy',phone:'admin',password:'admin',status:'active',city:'Dakar',specs:[],publics:[]}];
        dbSet('tla_users',users);
    }
    if(!dbGet('tla_media',null))dbSet('tla_media',[]);
}

document.addEventListener("DOMContentLoaded",function(){initDB();refreshInterface();});

function hideAllViews(){
    var ids=['view-auth','view-payment','view-platform','view-admin','page-main-content','page-profile','page-teachers'];
    for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]);if(el)el.classList.add('hidden');}
    var m=document.getElementById('teacher-modal');if(m)m.classList.add('hidden');
}

window.refreshInterface=function(){
    hideAllViews();
    var user=dbGet('tla_current_user',null);
    if(!user){document.getElementById('view-auth').classList.remove('hidden');switchAuth('login');}
    else if(user.needsPasswordChange){document.getElementById('view-auth').classList.remove('hidden');switchAuth('force-pass');}
    else if(user.role==='admin'){document.getElementById('view-admin').classList.remove('hidden');loadAdminData();}
    else if(user.role==='enseignant'&&user.status==='pending'){document.getElementById('view-payment').classList.remove('hidden');}
    else{
        document.getElementById('view-platform').classList.remove('hidden');
        showMainPage();
        // Admin button visible ONLY for admin
        var adminBtn=document.getElementById('admin-panel-btn');
        var statsBar=document.getElementById('admin-stats-bar');
        if(user.role==='admin'){
            if(adminBtn)adminBtn.classList.remove('hidden');
            if(statsBar){statsBar.classList.remove('hidden');updateStats();}
        } else {
            if(adminBtn)adminBtn.classList.add('hidden');
            if(statsBar)statsBar.classList.add('hidden');
        }
        var espBtn=document.getElementById('nav-espace-btn');
        var profBtn=document.getElementById('nav-profile-btn');
        if(user.role==='enseignant'){if(espBtn)espBtn.classList.remove('hidden');if(profBtn)profBtn.classList.add('hidden');}
        else{if(espBtn)espBtn.classList.add('hidden');if(profBtn)profBtn.classList.remove('hidden');}
    }
}

window.updateStats=function(){
    var users=dbGet('tla_users',[]);
    var teachers=0,students=0;
    for(var i=0;i<users.length;i++){
        if(users[i].role==='enseignant')teachers++;
        else if(users[i].role==='apprenant')students++;
    }
    var st=document.getElementById('stat-teachers');if(st)st.textContent=teachers;
    var ss=document.getElementById('stat-students');if(ss)ss.textContent=students;
    var stot=document.getElementById('stat-total');if(stot)stot.textContent=teachers+students;
}

window.goToPlatform=function(){
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('view-platform').classList.remove('hidden');
    // Admin garde son bouton et ses stats
    var adminBtn=document.getElementById('admin-panel-btn');if(adminBtn)adminBtn.classList.remove('hidden');
    var statsBar=document.getElementById('admin-stats-bar');if(statsBar){statsBar.classList.remove('hidden');updateStats();}
    var user=dbGet('tla_current_user',null);
    var espBtn=document.getElementById('nav-espace-btn');var profBtn=document.getElementById('nav-profile-btn');
    if(espBtn)espBtn.classList.add('hidden');if(profBtn)profBtn.classList.remove('hidden');
    showMainPage();
}

// Hamburger menu mobile
window.toggleMobileMenu=function(){
    var nc=document.getElementById('nav-center');
    if(nc)nc.classList.toggle('open');
}
window.closeMobileMenu=function(){
    var nc=document.getElementById('nav-center');
    if(nc)nc.classList.remove('open');
}
window.goToAdmin=function(){
    document.getElementById('view-platform').classList.add('hidden');
    document.getElementById('view-admin').classList.remove('hidden');
    loadAdminData();
}

window.showMainPage=function(){
    document.getElementById('page-profile').classList.add('hidden');
    var pt=document.getElementById('page-teachers');if(pt)pt.classList.add('hidden');
    document.getElementById('page-main-content').classList.remove('hidden');
    var nl=document.getElementById('platform-nav-links');if(nl)nl.classList.remove('hidden');
}

window.showTeachersPage=function(){
    document.getElementById('page-main-content').classList.add('hidden');
    document.getElementById('page-profile').classList.add('hidden');
    var pt=document.getElementById('page-teachers');if(pt)pt.classList.remove('hidden');
    var nl=document.getElementById('platform-nav-links');if(nl)nl.classList.remove('hidden');
    renderTeachersList();
    window.scrollTo({top:0,behavior:'smooth'});
}

window.goToSection=function(sectionId){
    // Si c'est la section enseignants, aller à la page séparée
    if(sectionId==='enseignants'){ showTeachersPage(); return; }
    // Sinon afficher la page principale et scroller
    document.getElementById('page-profile').classList.add('hidden');
    var pt=document.getElementById('page-teachers');if(pt)pt.classList.add('hidden');
    document.getElementById('page-main-content').classList.remove('hidden');
    var nl=document.getElementById('platform-nav-links');if(nl)nl.classList.remove('hidden');
    setTimeout(function(){
        var target=document.getElementById(sectionId);
        if(target){
            var headerHeight=70;
            var top=target.getBoundingClientRect().top+window.pageYOffset-headerHeight;
            window.scrollTo({top:top,behavior:'smooth'});
        }
    },100);
}
window.navToProfile=function(){
    document.getElementById('page-main-content').classList.add('hidden');
    var pt=document.getElementById('page-teachers');if(pt)pt.classList.add('hidden');
    document.getElementById('page-profile').classList.remove('hidden');
    fillProfileForm();
}

// --- AUTH ---
window.switchAuth=function(id){
    var s=['login','register','forgot','force-pass'];
    for(var i=0;i<s.length;i++){document.getElementById('auth-'+s[i]).classList.add('hidden');}
    document.getElementById('auth-'+id).classList.remove('hidden');
}
window.selectRole=function(role){
    document.getElementById('btn-role-apprenant').className="role-btn";
    document.getElementById('btn-role-enseignant').className="role-btn";
    document.getElementById('btn-role-'+role).className="role-btn active";
    document.getElementById('reg-role').value=role;
    if(role==='enseignant')document.getElementById('enseignant-options').classList.remove('hidden');
    else document.getElementById('enseignant-options').classList.add('hidden');
}
window.appRegister=function(){
    var role=document.getElementById('reg-role').value,name=document.getElementById('reg-name').value.trim(),phone=document.getElementById('reg-phone').value.trim(),city=document.getElementById('reg-city').value.trim(),pass=document.getElementById('reg-pass').value;
    if(!name||!phone||!city||!pass){alert("Remplissez tous les champs.");return;}
    var specs=[],pubs=[];
    if(role==='enseignant'){
        var sc=document.querySelectorAll('.reg-spec:checked');for(var i=0;i<sc.length;i++)specs.push(sc[i].value);
        var pc=document.querySelectorAll('.reg-public:checked');for(var i=0;i<pc.length;i++)pubs.push(pc[i].value);
        if(specs.length===0){alert("Choisissez au moins une spécialité.");return;}
    }
    var users=dbGet('tla_users',[]);
    for(var i=0;i<users.length;i++){if(users[i].phone===phone){alert("Numéro déjà inscrit.");return;}}
    var u={id:'u_'+new Date().getTime(),role:role,name:name,phone:phone,city:city,password:pass,status:(role==='enseignant'?'pending':'active'),specs:specs,publics:pubs,bio:'',avatar:''};
    users.push(u);dbSet('tla_users',users);dbSet('tla_current_user',u);refreshInterface();
}
window.appLogin=function(){
    var id=document.getElementById('login-id').value.trim(),pass=document.getElementById('login-pass').value;
    if(!id||!pass){alert("Remplissez vos identifiants.");return;}
    var users=dbGet('tla_users',[]),found=null;
    for(var i=0;i<users.length;i++){if((users[i].phone===id||users[i].email===id)&&users[i].password===pass){found=users[i];break;}}
    if(found){if(found.status==='blocked'){alert("Compte bloqué.");return;}dbSet('tla_current_user',found);refreshInterface();}
    else{alert("Identifiants incorrects.");}
}
window.appForgotPass=function(){
    var phone=document.getElementById('forgot-phone').value.trim();
    var users=dbGet('tla_users',[]),idx=-1;
    for(var i=0;i<users.length;i++){if(users[i].phone===phone)idx=i;}
    if(idx!==-1){alert("Simulation WhatsApp : code '1234' envoyé au "+phone);users[idx].password="1234";users[idx].needsPasswordChange=true;dbSet('tla_users',users);switchAuth('login');}
    else{alert("Numéro introuvable.");}
}
window.appForcePassChange=function(){
    var np=document.getElementById('force-new-pass').value;if(np.length<4){alert("Trop court.");return;}
    var cu=dbGet('tla_current_user',null),users=dbGet('tla_users',[]);
    for(var i=0;i<users.length;i++){if(users[i].id===cu.id){users[i].password=np;users[i].needsPasswordChange=false;dbSet('tla_users',users);dbSet('tla_current_user',users[i]);refreshInterface();return;}}
}
window.appLogout=function(){dbSet('tla_current_user',null);refreshInterface();}
window.proceedToProfileSetup=function(){
    document.getElementById('view-payment').classList.add('hidden');
    document.getElementById('view-platform').classList.remove('hidden');
    document.getElementById('platform-nav-links').classList.add('hidden');
    var espBtn=document.getElementById('nav-espace-btn');if(espBtn)espBtn.classList.remove('hidden');
    navToProfile();
}

// --- TEACHERS ---
window.renderTeachersList=function(){
    var container=document.getElementById('teachers-list-container');if(!container)return;container.innerHTML="";
    var ci=document.getElementById('search-city'),si=document.getElementById('search-spec'),pi=document.getElementById('search-public');
    var sc=ci?ci.value.toLowerCase():"",ss=si?si.value:"",sp=pi?pi.value:"";
    var users=dbGet('tla_users',[]),allMedia=dbGet('tla_media',[]),count=0;
    for(var i=0;i<users.length;i++){
        var u=users[i];
        if(u.role!=='enseignant'||u.status!=='active')continue;
        if(sc&&(!u.city||u.city.toLowerCase().indexOf(sc)===-1))continue;
        if(ss&&(!u.specs||u.specs.indexOf(ss)===-1))continue;
        if(sp&&(!u.publics||u.publics.indexOf(sp)===-1))continue;
        count++;
        var div=document.createElement('div');div.className="teacher-card";
        var av=u.avatar?u.avatar:'https://ui-avatars.com/api/?name='+encodeURIComponent(u.name)+'&background=1a3a6b&color=fff&size=150';
        var spH="";if(u.specs){for(var s=0;s<u.specs.length;s++)spH+='<span class="badge">'+u.specs[s]+'</span>';}
        var puH="";if(u.publics){for(var p=0;p<u.publics.length;p++)puH+='<span class="public-badge">'+u.publics[p]+'</span>';}
        var bioH=u.bio?'<p class="teacher-bio">"'+u.bio.substring(0,100)+(u.bio.length>100?'...':'')+'"</p>':'';
        var mc=0;for(var m=0;m<allMedia.length;m++){if(allMedia[m].userId===u.id)mc++;}
        var mn=mc>0?'<p class="text-sm" style="margin-bottom:8px;"><i class="fa-solid fa-images" style="color:var(--accent-color);"></i> '+mc+' média(s)</p>':'';
        // WhatsApp auto message
        var cu=dbGet('tla_current_user',null);
        var waMsg=encodeURIComponent("Salam, je vous contacte via Tilawah Link Academy pour des cours. Je suis "+((cu&&cu.name)?cu.name:"un apprenant")+" de "+((cu&&cu.city)?cu.city:"")+".");
        var waUrl="https://wa.me/"+(u.phone||"").replace(/[\+\s]/g,'')+"?text="+waMsg;
        div.innerHTML='<div class="teacher-avatar"><img src="'+av+'"></div><div class="teacher-info"><h3>'+u.name+'</h3><p class="text-sm mb-3"><i class="fa-solid fa-location-dot"></i> '+(u.city||"")+'</p><div class="specs-badges">'+spH+'</div><div class="specs-badges" style="margin-bottom:8px;">'+puH+'</div>'+bioH+mn+'<button class="btn btn-primary w-100" style="margin-bottom:8px;" onclick="openTeacherModal(\''+u.id+'\')"><i class="fa-solid fa-eye"></i> Profil complet</button><a href="'+waUrl+'" target="_blank" class="btn btn-whatsapp w-100"><i class="fa-brands fa-whatsapp"></i> Contacter</a></div>';
        container.appendChild(div);
    }
    if(count===0)container.innerHTML='<p class="w-100 text-center mt-4">Aucun enseignant trouvé.</p>';
}

// --- MODAL ---
window.openTeacherModal=function(tid){
    var users=dbGet('tla_users',[]),allMedia=dbGet('tla_media',[]),t=null;
    for(var i=0;i<users.length;i++){if(users[i].id===tid)t=users[i];}
    if(!t)return;
    var av=t.avatar?t.avatar:'https://ui-avatars.com/api/?name='+encodeURIComponent(t.name)+'&background=1a3a6b&color=fff&size=200';
    var spH="";if(t.specs){for(var s=0;s<t.specs.length;s++)spH+='<span class="badge">'+t.specs[s]+'</span> ';}
    var puH="";if(t.publics){for(var p=0;p<t.publics.length;p++)puH+='<span class="public-badge">'+t.publics[p]+'</span> ';}
    var cu=dbGet('tla_current_user',null);
    var waMsg=encodeURIComponent("Salam, je vous contacte via Tilawah Link Academy pour des cours. Je suis "+((cu&&cu.name)?cu.name:"un apprenant")+" de "+((cu&&cu.city)?cu.city:"")+".");
    var waUrl="https://wa.me/"+(t.phone||"").replace(/[\+\s]/g,'')+"?text="+waMsg;
    var body=document.getElementById('teacher-modal-body');
    // Construire le modal avec un conteneur vide pour la galerie
    var hasMedia=false;
    for(var m=0;m<allMedia.length;m++){if(allMedia[m].userId===t.id){hasMedia=true;break;}}
    body.innerHTML='<button class="modal-close" onclick="closeTeacherModal()">&times;</button>'
        +'<div class="text-center"><img src="'+av+'" style="width:150px;height:150px;border-radius:50%;object-fit:cover;border:5px solid var(--primary);margin-bottom:20px;"></div>'
        +'<h2 class="text-center" style="margin-bottom:5px;">'+t.name+'</h2>'
        +'<p class="text-center text-sm mb-3"><i class="fa-solid fa-location-dot"></i> '+(t.city||"")+'</p>'
        +'<div class="text-center mb-3">'+spH+'</div>'
        +(puH?'<div class="text-center mb-3">'+puH+'</div>':'')
        +(t.bio?'<div style="background:var(--bg);padding:20px;border-radius:15px;margin-bottom:20px;"><h4 style="margin-bottom:10px;">📝 Présentation</h4><p style="white-space:pre-wrap;">'+t.bio+'</p></div>':'')
        +(hasMedia?'<h4 style="margin-bottom:10px;">📸 Galerie</h4><div id="modal-gallery-items" class="modal-gallery"></div>':'')
        +'<a href="'+waUrl+'" target="_blank" class="btn btn-whatsapp w-100 mt-4" style="display:flex;align-items:center;justify-content:center;gap:10px;font-size:1.1rem;padding:15px;"><i class="fa-brands fa-whatsapp"></i> Contacter sur WhatsApp</a>';
    // Charger les médias depuis IndexedDB
    if(hasMedia){
        var gc=document.getElementById('modal-gallery-items');
        for(var m=0;m<allMedia.length;m++){
            if(allMedia[m].userId===t.id){
                (function(media){
                    getBlob(media.id,function(blob){
                        if(!blob||!gc)return;
                        var url=URL.createObjectURL(blob);
                        if(media.type&&media.type.startsWith('video/')){
                            var v=document.createElement('video');v.src=url;v.controls=true;
                            v.style.maxWidth='100%';v.style.borderRadius='12px';
                            gc.appendChild(v);
                        }else{
                            var img=document.createElement('img');img.src=url;
                            img.style.maxWidth='100%';img.style.borderRadius='12px';img.style.cursor='pointer';
                            img.onclick=function(){window.open(url);};
                            gc.appendChild(img);
                        }
                    });
                })(allMedia[m]);
            }
        }
    }
    document.getElementById('teacher-modal').classList.remove('hidden');
}
window.closeTeacherModal=function(){document.getElementById('teacher-modal').classList.add('hidden');}

// --- PROFILE / ESPACE ENSEIGNANT ---
window.fillProfileForm=function(){
    var cu=dbGet('tla_current_user',null);if(!cu)return;
    var ensH=document.getElementById('espace-ens-header');
    var appH=document.getElementById('espace-app-header');
    var pw=document.getElementById('profile-warning');
    var pa=document.getElementById('profile-active');
    if(cu.role==='enseignant'){
        if(ensH)ensH.classList.remove('hidden');if(appH)appH.classList.add('hidden');
        document.getElementById('profile-teacher-options').classList.remove('hidden');
        if(cu.status==='pending'){if(pw)pw.classList.remove('hidden');if(pa)pa.classList.add('hidden');}
        else{if(pw)pw.classList.add('hidden');if(pa)pa.classList.remove('hidden');}
        document.getElementById('my-bio').value=cu.bio||'';
        // Check current specs
        var cbs=document.querySelectorAll('.prof-spec');
        for(var i=0;i<cbs.length;i++){cbs[i].checked=cu.specs&&cu.specs.indexOf(cbs[i].value)!==-1;}
        renderMyGallery();
    } else {
        if(ensH)ensH.classList.add('hidden');if(appH)appH.classList.remove('hidden');
        document.getElementById('profile-teacher-options').classList.add('hidden');
    }
    if(cu.avatar)document.getElementById('my-avatar-preview').src=cu.avatar;
}

window.saveMyProfile=function(){
    var cu=dbGet('tla_current_user',null),users=dbGet('tla_users',[]),idx=-1;
    for(var i=0;i<users.length;i++){if(users[i].id===cu.id)idx=i;}
    if(idx===-1)return;
    if(cu.role==='enseignant'){
        users[idx].bio=document.getElementById('my-bio').value;
        // Update specs from profile
        var newSpecs=[];
        var cbs=document.querySelectorAll('.prof-spec:checked');
        for(var i=0;i<cbs.length;i++)newSpecs.push(cbs[i].value);
        users[idx].specs=newSpecs;
    }
    var fi=document.getElementById('my-avatar-input');
    if(fi.files.length>0){
        var reader=new FileReader();
        reader.onload=function(e){users[idx].avatar=e.target.result;dbSet('tla_users',users);dbSet('tla_current_user',users[idx]);alert("Profil enregistré !");fillProfileForm();};
        reader.readAsDataURL(fi.files[0]);
    } else {dbSet('tla_users',users);dbSet('tla_current_user',users[idx]);alert("Profil enregistré !");}
}

window.uploadMediaToGallery=function(){
    var cu=dbGet('tla_current_user',null);
    var fi=document.getElementById('my-gallery-upload');
    if(fi.files.length===0)return;
    var file=fi.files[0];
    var maxSize=file.type.startsWith('video/')?1073741824:104857600;
    if(file.size>maxSize){alert('Fichier trop volumineux.');return;}
    var mid='m_'+new Date().getTime();
    saveBlob(mid,file,function(){
        var allMedia=dbGet('tla_media',[]);
        allMedia.push({id:mid,userId:cu.id,type:file.type});
        dbSet('tla_media',allMedia);
        fi.value='';
        renderMyGallery();
    });
}

function renderMediaItem(mid,mtype,container,showDel,extra){
    getBlob(mid,function(blob){
        if(!blob)return;
        var url=URL.createObjectURL(blob);
        var div=document.createElement('div');div.className='media-item';
        if(extra){div.style.height='auto';div.style.paddingBottom='30px';}
        if(mtype&&mtype.startsWith('video/')){
            var v=document.createElement('video');v.src=url;v.controls=true;
            v.style.width='100%';v.style.height=extra?'120px':'100%';v.style.objectFit='cover';
            div.appendChild(v);
        }else{
            var img=document.createElement('img');img.src=url;
            img.style.width='100%';img.style.height=extra?'120px':'100%';img.style.objectFit='cover';
            div.appendChild(img);
        }
        if(showDel){
            var btn=document.createElement('button');btn.className='delete-media-btn';
            btn.innerHTML='<i class="fa-solid fa-trash"></i>';
            btn.onclick=function(){deleteMedia(mid);};
            div.appendChild(btn);
        }
        if(extra){div.insertAdjacentHTML('beforeend',extra);}
        container.appendChild(div);
    });
}

window.renderMyGallery=function(){
    var cu=dbGet('tla_current_user',null),allMedia=dbGet('tla_media',[]);
    var c=document.getElementById('my-gallery-container');if(!c)return;c.innerHTML='';
    for(var i=0;i<allMedia.length;i++){
        if(allMedia[i].userId===cu.id) renderMediaItem(allMedia[i].id,allMedia[i].type,c,true,null);
    }
}

window.deleteMedia=function(mid){
    if(!confirm('Supprimer ?'))return;
    delBlob(mid,function(){
        var all=dbGet('tla_media',[]),n=[];
        for(var i=0;i<all.length;i++){if(all[i].id!==mid)n.push(all[i]);}
        dbSet('tla_media',n);
        var cu=dbGet('tla_current_user',null);
        if(cu&&cu.role==='admin')loadAdminData();else renderMyGallery();
    });
}

// --- ADMIN ---
window.loadAdminData=function(){
    var users=dbGet('tla_users',[]),allMedia=dbGet('tla_media',[]);
    var tb=document.getElementById('admin-table-body');if(!tb)return;tb.innerHTML='';
    for(var i=0;i<users.length;i++){
        var u=users[i];if(u.role==='admin')continue;
        var sb='';
        if(u.status==='active')sb='<span class="status-badge status-active">Actif</span>';
        else if(u.status==='pending')sb='<span class="status-badge status-pending">En attente</span>';
        else sb='<span class="status-badge status-blocked">Bloqué</span>';
        var btns='';
        if(u.status!=='active')btns+='<button class="btn btn-success" style="padding:5px 10px;font-size:.8rem;margin:2px;" onclick="adminSetStatus(\''+u.id+'\',\'active\')">Valider</button>';
        if(u.status!=='blocked')btns+='<button class="btn btn-danger" style="padding:5px 10px;font-size:.8rem;margin:2px;" onclick="adminSetStatus(\''+u.id+'\',\'blocked\')">Bloquer</button>';
        var tr=document.createElement('tr');
        tr.innerHTML='<td>'+u.name+'</td><td>'+(u.role||'').toUpperCase()+'</td><td>'+u.phone+'</td><td>'+(u.city||'')+'</td><td>'+sb+'</td><td>'+btns+'</td>';
        tb.appendChild(tr);
    }
    var gb=document.getElementById('admin-gallery-body');if(!gb)return;gb.innerHTML='';
    if(allMedia.length===0){gb.innerHTML='<p>Aucun média.</p>';return;}
    for(var m=0;m<allMedia.length;m++){
        var media=allMedia[m],own='?';
        for(var j=0;j<users.length;j++){if(users[j].id===media.userId)own=users[j].name;}
        var ex='<p style="font-size:.7rem;color:white;text-align:center;padding:3px;position:absolute;bottom:0;width:100%;background:rgba(0,0,0,.5);">'+own+'</p>';
        renderMediaItem(media.id,media.type,gb,true,ex);
    }
}
window.adminSetStatus=function(uid,ns){
    var users=dbGet('tla_users',[]);
    for(var i=0;i<users.length;i++){if(users[i].id===uid)users[i].status=ns;}
    dbSet('tla_users',users);loadAdminData();
}




