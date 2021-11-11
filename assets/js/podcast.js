var max_allowed_opened = 1;
var max_podcasts_initial = 100;
var max_podcasts_loadin = 50;
var max_comments_intial = 50;
var opened = [];
var podcasts = {};
var comment_cache = {};
var userdatas = {};
var liked;
var disliked;


var search = '';
var sort = 'newest';
var hitBottom = false;
var addonOffset = 0;
var objectsLoaded = 0;
var lastObjIndex = 0;
var shouldClearStrength = 0;
var clearAwayObjects = 100;
var clearing = false;

var currentSearch = '';

var playing = false;
var playingId = 0;
var playerSrc = 'https://open.spotify.com/embed/episode/{0}?utm_source=generator&theme=0';
var currentPlayingGlowInterval;


var commentsLoaded = 0;
var currentReplyId = 0;



//#####################################//
//          HTML TEMPLATES             //
//#####################################//

var comment_com_bar = '<div class="com-bar">' +
    '<a class="com-date">{9}</a>' +
    '<a class="com-like"><i class="fa fa-heart"></i><i class="fa fa-heart-broken"></i>{10}</a>' +
    '<a class="com-comment"><i class="far fa-comment"></i>{11}</a>' +
    '<a class="com-reply"><i class="fas fa-reply"></i>Reply</a></div>';
//0-'id'
//1-'name'
//2-'nameColor'
//3-'comment'
//4-'podcast'
//5-'master'
//6-'replyToId'
//7-'replyToName'
//8-'replyToColor'
//9-'datetime'
//10-'likes'
//11-'subCount'

var spotify_web_template = '<iframe' +
    'src="https://open.spotify.com/embed/episode/{0}?utm_source=generator" width="100%" height="232"' +
    'frameBorder="0" allowFullScreen=""' +
    'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>';

var sub_comment_template = '<div class="com-sub" id="{0}" podcastId="{4}" masterId="{5}" replyToId="{6}" date="{12}">' +
    '<a class="com-text">' +
    '<i class="com-name-wrap"><i class="fa fa-heart com-donor"></i>' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{3}</a>' +
    comment_com_bar + '</div>';

var sub_comment_template_deep = '<div class="com-sub" id="{0}" podcastId="{4}" masterId="{5}" replyToId="{6}" date="{12}">' +
    '<a class="com-text">' +
    '<div class="com-reply-top">' +
    '<span class="com-name-reply" style="color:{2};">{1}</span>' +
    '<i class="fa fa-arrow-right split"></i>' +
    '<span class="com-name-reply" style="color:{8};">{7}</span></i></div>' +
    '<i class="com-name-wrap"><i class="fa fa-heart com-donor"></i>' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{3}</a>' +
    comment_com_bar + '</div>';

var comment_template = '<div class="com" id="{0}" podcastId="{4}" masterId="{5}" replyToId="6" date="{12}">' +
    '<a class="com-text">' +
    '<i class="com-name-wrap"><i class="fa fa-heart com-donor"></i>' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{3}</a>' +
    comment_com_bar +
    '<div class="com-subs"></div></div>';

var dataBar = '<div class="data-bar"><a><i class="far fa-calendar-alt"></i><span>{0}</span></a>' +
    '<a><i class="far fa-clock"></i><span>{1}</span></a>' +
    '<a><i class="fa fa-heart"></i><span class="score-total">{2}</span></a>' +
    '<a><i class="far fa-comment"></i><span class="comment-total">{3}</span></a></div>';

var commentInputTemplate = '<div class="comment"><a class="comment-max-char"></a>' +
    '<a class="comment-input" contenteditable="true" name="comment" maxlength="250" placeholder="Write a comment!" required></a>' +
    '<input class="comment-submit" type="submit" value="">' +
    '<i class="fa fa-arrow-right submit"></i></div>';

var loadingCommentsTemplate = '<div class="loading-comments">' +
    '<div class="dots">' +
    '<div class="circle c-1"></div>' +
    '<div class="circle c-2"></div>' +
    '<div class="circle c-3"></div></div>' +
    '<h3>Loading Comments</h3></div>'

var commentsWrapTemplate = '<div class="comments-wrap"><div class="comments no-scroll-bar-com">' + loadingCommentsTemplate + '</div></div>';


//#####################################//
//               STARTUP               //
//#####################################//

$(document).ready(function(){
    //Request podcast data
    getPodcastData();

    //Start the Auto Updater
    startAutoUpdater();

    // Register All Events
    registerPageEvents();
    registerPodcastEvents();
    registerCommentEvents();

    //Initial Stylings
    $('#top-bar').addClass('make-visible');
});


//#####################################//
//          EMBEDDED PLAYER            //
//#####################################//

function enablePlayer(podcastId){
    //$('.player').attr('src', playerSrc.format(podcasts[podcastId].spotify));
    var podcast = $('#podcast-' + podcastId);
    podcast.addClass('currently-playing');
    $('#top-bar').css('opacity', 0);
    currentPlayingGlow(podcastId);
    setTimeout(function (){
        $('#top-bar').hide();
        $('#player-bar').show();
        $('#player-bar').css('opacity','1');
    }, 500);
    playing = true;
    playingId = podcastId;

}
function disablePlayer(){
    $('#player-bar').css('opacity', 0);
    $('#player-bar').removeClass('extended');
    setTimeout(function (){
        $('#player-bar').hide();
        $('#top-bar').show();
        $('#top-bar').css('opacity','1');
        $('.player').attr('src', '');
    }, 500);
    clearInterval(currentPlayingGlowInterval);
    $('.podcast').css('transition', 'height ease 0.5s, border ease 0.5s');
    $('.podcast').removeClass('currently-playing');
    playing = false;
}
function expandPlayer(podcastId){
    if($('#player-bar').hasClass('extended')){
        $('#player-bar').removeClass('extended');
    }else{
        $('#player-bar').addClass('extended');
    }
}
function currentPlayingGlow(podcastId){
    $('#podcast-' + podcastId).css('transition', 'height ease 0.5s, border ease 4s');
    currentPlayingGlowInterval = setInterval(function (){
        $('#podcast-' + podcastId).addClass('currently-playing');
        setTimeout(function (){
            $('#podcast-' + podcastId).removeClass('currently-playing');
        }, 2500);
    },4000);
}


//#####################################//
//            PODCAST DATA             //
//#####################################//

// Get All Podcast Data
function getPodcastData(){
    waRequestAllPodcastData();
}

// Update Podcast Viewport with Data
function updatePodcastView(loadin=false){
    togglePodcastLoadScreen(false);
    var container = $('#container');
    var amountToAdd = max_podcasts_initial;
    if(loadin){
        amountToAdd = max_podcasts_loadin;
    }
    else{
        addonOffset = 0;
        objectsLoaded = 0;
        container.text('');
        $('#container').animate({scrollTop: 0}, 'fast');
    }
    //Get All Podcasts
    var view = Object.keys(podcasts).map(function(key){return podcasts[key];});

    //Apply Sort
    if(sort == 'newest'){
        view = view.reverse();
    }
    else if(sort == 'oldest'){

    }
    else if(sort == 'popular'){
        view = view.sort((a, b) => parseFloat(b.popularity) - parseFloat(a.popularity));
    }

    //Apply Filter
    if(search != ''){
        var searchTemp = search.toUpperCase();
        currentSearch = searchTemp;
        $('#search-submit').val('CLEAR');
        view = view.filter(function(element){
            if(element[0].toString().includes(searchTemp) || element[1].toString().toUpperCase().includes(searchTemp) || element[3].toString().includes(searchTemp)){
                return true;
            }
        });
    }
    //Apply Limit
    view = view.slice(addonOffset, amountToAdd + addonOffset);
    addonOffset += amountToAdd;
    $.each(view, function (index, podcast){
        var podcastTemplate = '<div class="podcast" id="podcast-{0}">' +
            '<div class="podcast-click"></div>' +
            '<a class="id">{0}</a>' +
            '<a class="name">{1}</a>' +
            '<span class="duration-preview">{2}</span>' +
            '<div class="play"><i class="fa fa-play"></i>PLAYER</div>' +
            '<i class="fa fa-close close"></i>' +
            '<div class="content"></div></div>';
        container.append(podcastDataFormat(podcastTemplate, podcast));
        objectsLoaded += 1;
    });
}
function podcastDataFormat(template, podcast){
    return template.format(podcast.id, podcast.name, podcast.duration, podcast.date, podcast.comments, podcast.score, podcast.popularity);
}

function loadMorePodcasts(){
    updatePodcastView(true);
    setTimeout(hitBottom = false, 2000);
}
function checkIfShouldClear(){
    if(shouldClearStrength > 10){
        shouldClearStrength = 0;
        if(!clearing){
            clearing = true;
            clearOutPodcasts(clearAwayObjects)
        }
        console.log('Should Definitly Clear!');
    }
}
function clearOutPodcasts(amount){
    $('#container > .podcast').slice(-amount).remove();
    clearing = false;
    objectsLoaded -= amount;
}

function updateCurrentPodcastData(){
    if(opened[0] != null && opened[0] != undefined){
        waRequestSpecificPodcastData(getPodcastId(opened[0]));
    }
}

//#####################################//
//               PODCASTS              //
//#####################################//

// Enable/Disable Podcast Loading Screen
function togglePodcastLoadScreen(visible){
    if(visible){
        $('#loading-podcast').show();
        enableLoadSequence();
    }
    else{
        $('#loading-podcast').hide();
        disableLoadSequence();
    }
}

// PODCAST - ON / OFF
function turnOn(podcast){
    var podcastId = getPodcastId(podcast);
    var podcastData = podcasts[podcastId];
    var content = podcast.find('.content');

    var removal = 0;
    if(opened.length >= max_allowed_opened){
        removal = clearOpened(podcast);
    }
    scrollTo(podcast, removal);

    // Player
    var playbtn = podcast.find('.play i');
    if(playbtn != undefined && playing){
        var play = podcast.find('.play');
        if(playingId === podcastId){
            playbtn.removeClass('fa-play');
            playbtn.addClass('fa-close');
        }
        else{
            playbtn.addClass('fa-play');
            playbtn.removeClass('fa-close');
        }
    }
    else if(playbtn != undefined){
        playbtn.addClass('fa-play');
    }

    // BUILD PODCAST
    content.text('');
    var date = new Date(podcastData.date);
    date = date.getMonth() + '/' + date.getDay() + '/' + date.getFullYear().toString().substr(2);
    content.append(dataBar.format(date, podcastData.duration, podcastData.score, podcastData.comments));
    content.append(commentsWrapTemplate);
    content.append(commentInputTemplate);

    // EXTEND PODCAST
    podcast.addClass('extended');
    podcast.find('.comment-max-char').text('0');

    if(isLoggedIn()){
        waRequestUserDataProcComments(podcastId)
    }else{
        // Get Comments For This Podcast
        getCommentsMaster(podcastId, max_comments_intial, 0);
    }
    opened.push(podcast);
    setTimeout(function (){
        $('#container').css('overflow', 'hidden');
    },500);
    gtag('event','open_podcast', {
        "id": podcastId,
        "name": podcastData[1]
    });
}
function turnOff(podcast){
    if(playing){
        $('#playing-prompt').css('opacity', 1);
        $('#playing-prompt').css('pointer-events', 'auto');
    }
    var podcastId = getPodcastId(podcast);
    var podcastData = podcasts[podcastId];
    podcast.removeClass('extended');
    setTimeout(function (){
        podcast.find('.content').text('');
    }, 500);
    $('#container').css('overflow-y', 'scroll');
    gtag('event','close_podcast', {
        "id": podcastId,
        "name": podcastData[1]
    });
}
function removeFromOpened(podcast){
    if(opened.length > 0){
        var newopen = [];
        for(i=0;i<opened.length;i++){
            if(opened[i].id != podcast.id){
                newopen.push(opened[i]);
            }
        }
        opened = newopen;
    }
}
function clearOpened(podcast){
    var removal = 0;
    var offset = podcast.offset().top;
    if(opened.length > 0){
        for(i=0;i<opened.length;i++){
            if(opened[i].offset().top < offset){
                removal += 1;
            }
            turnOff(opened[i]);
        }
        opened = [];
        var onevh = $(window).height() / 100;
        return removal * (onevh * 72);
    }
    return 0;
}
function scrollTo(selector, removal) {
    var offset = selector.offset();
    var $main = $('#container');
    $main.animate({
        scrollTop: offset.top - ($main.offset().top - $main.scrollTop()) - removal
    }, "fast");
}


//#####################################//
//             COMMENTING              //
//#####################################//

// Comment Updating
function getCommentsMaster(podcastId, amount, offset){
    var pageUrl = '/data/master/' + podcastId + '/comments/' + amount + '/' + offset + '/';
    var comments = []
    $.ajax({
        type: 'GET',
        url: pageUrl,
        dataType: 'json',
        success: function (data) {
            updateCommentDisplay(podcastId,data.comments, data.comments_total, Object.keys(data.comments).length, false);
        },
        error: function (error){
            console.log(error);
        }
    });
}
function getCommentsSub(commentId, amount, offset){
    var pageUrl = '/data/sub/' + commentId + '/comments/' + amount + '/' + offset + '/';
    var comments = []
    $.ajax({
        type: 'GET',
        url: pageUrl,
        dataType: 'json',
        success: function (data) {
            var comment = $('#' + commentId);
            var comments_length = Object.keys(data.comments).length;
            if(comments_length != 0){
                comment.attr('extended', 'yes');
                comment.find('.com-sub-extend').show();
                var loaded = comment.attr('loaded');
                if(loaded === 'NaN' || loaded == undefined){
                    loaded = 0;
                }
                loaded = parseInt(loaded);

                comment.attr('loaded', loaded += comments_length);
                comment.find('.com-subs').css('border-top','solid 1px rgba(0,0,0,0.25)');
                comment.find('.com-subs').css('background','rgba(255,255,255,0.025)');
            }
            else{
                comment.attr('extended', 'no');
                comment.find('.com-subs').text('');
                comment.find('.com-sub-extend').hide();
                comment.find('.com-subs').css('padding-bottom', '0');
                comment.attr('loaded', 0);
                comment.find('.com-subs').css('border-top','none');
                comment.find('.com-subs').css('background','transparent');
            }
            updateCommentDisplay(commentId,data.comments, data.comments_total, comments_length, true);
        },
        error: function (error){
            console.log(error);
        }
    });
}
function updateCommentDisplay(id, comments,  potential_comments, total_comments, subComment=false){
    var podcastId,podcast;
    var masterId,master,replyToId, replyToName, replyToColor;
    var commentSection;
    var ready = false;
    if(subComment){
        masterId = id;
        master = $('#' + id);
        if(master != null){
            commentSection = master.find('.com-subs');
            podcastId = master.attr('podcastId');
            if(podcastId != null){
                podcast = $('#podcast-' + podcastId);
                if(podcast != null){
                    ready = true;
                }
            }
        }
    }else{
        podcastId = id;
        podcast = $('#podcast-' + podcastId);
        if(podcast != null){
            commentSection = podcast.find('.comments')
            ready = true;
        }
    }
    if(!ready){
        return;
    }

    var databar = podcast.find('.data-bar');
    commentSection.text('');
    var count = 0;
    $.each(comments, function(index, comment){
        if(subComment){
            if(comment.replyToId !== 0 && comment.replyToId !== comment.master){
                commentSection.append(formatComment(sub_comment_template_deep, comment));
                //0-'id'
                //1-'name'
                //2-'nameColor'
                //3-'donor'
                //4-'comment'
                //5-'podcast'
                //6-'master'
                //7-'replyToId'
                //8-'replyToName'
                //9-'replyToColor'
                //10-'user'
                //11-'datetime'
                //12-'likes'
                //13-'dislikes'
            }else{
                commentSection.append(formatComment(sub_comment_template, comment));
            }
        }else{
            commentSection.append(formatComment(comment_template, comment));
        }
        updateComment(podcastId, comment.id);
        if(count == total_comments - 1){
            $('#' + comment.id).css('border-bottom', 'none');
        }
        count += 1;
    });
    potential_comments = parseInt(potential_comments);
    if(subComment && total_comments > 0 && potential_comments > total_comments){
        commentSection.append('<a class="com-sub-extend">LOAD MORE</a>');
        commentSection.find('.com-sub-extend').show();
        commentSection.css('padding-bottom', '2vh');
    }

}
function formatComment(commentTemplate, comment){
    return commentTemplate.format(comment.id,
        comment.username,
        stringToColor(comment.username),
        comment.comment,
        comment.podcast,
        comment.master,
        comment.replyToId,
        comment.replyToName,
        stringToColor(comment.replyToName),
        timeSince(Date.parse(comment.datetime)),
        nFormatter(comment.likes, 1),
        nFormatter(comment.subCount, 1),
        comment.datetime)
}
function updateCommentTimes(){
    $('[date]').each(function(index, comment){
        $(comment).find('.com-date').text(timeSince(Date.parse($(comment).attr('date'))));
    });
}
function updateComment(podcastId, commentId){
    var likeBtn = $('#' + commentId).find('.com-like');
    if(hasLiked(commentId)){
        likeBtn.addClass('liked');
    }else{
        likeBtn.removeClass('liked');
    }
}

// Comment Input
function setInputPop(podcastId, name, color){
    var popTemplate = '<span class="pop" style="color:' + color + ';" contenteditable="false"><i class="fa fa-close" style="color:#4d4d4d;"></i>{0}</span>&nbsp;';
    var commentInput = $('#podcast-' + podcastId).find('.comment-input');
    if(commentInput != null){
        var check = commentInput.find('.pop');
        if(check != null){
            check.remove();
        }
        commentInput.text('');
        commentInput.append(popTemplate.format(name));
    }
}
function clearInputPop(podcastId){
    var commentInput = $('#podcast-' + podcastId).find('.comment-input');
    if(commentInput != null) {
        var check = commentInput.find('.pop');
        if (check != null) {
            check.remove();
        }
    }
}
function clearTextInput(podcastId){
    var podcast = $('#podcast-' + podcastId);
    if(podcast != 'undefined'){
        podcast.find('.comment-input').html('');
    }
}

// Is this commentId in UserData Likes
function hasLiked(podcastId, commentId) {
    if(userdatas[podcastId] != null){
        return userdatas[podcastId].likes.includes(commentId);
    }
    return false;
}
// Add Like to Comment
function addLike(podcastId, commentId){
    if(userdatas[podcastId] != null){
        userdatas[podcastId].likes.push(commentId);
    }
    else{
        userdatas[podcastId] = {'likes':[commentId] , 'comments': []};
    }
}
function addLikeSuccess(podcastId, commentId){
    if(!hasLiked(podcastId, commentId)){
        //Like the Comment
        addLike(podcastId, commentId);
        updateComment(podcastId, commentId);
        addToCommentLikes(commentId, 1);
    }
    else{
        //Dislike the Comment
        removeLike(podcastId, commentId);
        updateComment(podcastId, commentId);
        addToCommentLikes(commentId, -1);
    }
}
function addLikeFailed(errorMessage) {
    console.log(errorMessage);
}
// Remove Like from Comment
function removeLike(podcastId, commentId){
    var new_liked = [];
    if(userdatas[podcastId] != null){
        var likesList = userdatas[podcastId].likes;
        $.each(likesList, function (comment_id){
            if(comment_id != commentId){
                new_liked.push(commentId);
            }
        });
        userdatas[podcastId].likes = new_liked;
    }
}
function removeLikeSuccess(commentId){
    if(!hasDisliked(commentId)){
        wasLiked = false;
        if(hasLiked(commentId)) {
            removeLikeComment(commentId);
            wasLiked = true;
        }
        $.ajax({
            type: 'GET',
            url: pageUrl,
            dataType: 'json',
            success: function (data) {
                disliked.push(commentId);
                updateComment(commentId);
                var points = comment.find('.com-points').text();
                if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
                }else{
                    points = parseInt(points);
                    points -= 1;
                    if(wasLiked){
                        points -= 1;
                    }
                    comment.find('.com-points').text(nFormatter(points, 1));
                }
            },
            error: function (error){
                console.log(error);
            }
        });


    }
    else{
        removeDislikeComment(podcastId, commentId);
        updateComment(podcastId, commentId);
        addToCommentLikes(commentId, 1);
    }
}
function removeLikeFailed(errorMessage){
    console.log(errorMessage);
}
// Locally Change Like Count on Comment
function addToCommentLikes(commentId, amount){
    var comment = $('#' + commentId);
    var points = comment.find('.com-like').text();
    if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
    }else{
        points = parseInt(points);
        points += amount;
        comment.find('.com-like').html('<i class="fa fa-heart"></i><i class="fa fa-heart-broken"></i>' + nFormatter(points, 1));
    }
}
// Submit Comment
function submitComment(podcastId, userId, commentText, parentId=0, replyToId=0){
    if(commentText.length > 1){
        //Call Web Action
        waSubmitComment(podcastId, userId, commentText, parentId, replyToId);
        gtag('event','comment_submit', {
            "id": podcastId
        });
    }
}
function submitCommentSuccess(podcastId, commentId, parentId, replyToId, subComment){
    clearTextInput(podcastId);
    addLike(podcastId, commentId)
    if(subComment){
        var loaded = $('#' + parentId).attr('loaded');
        if(loaded == undefined){
            return
        }
        if(loaded === 'NaN' || loaded === '0' || loaded < 5){
            loaded = 5;
        }
        getCommentsSub(parentId, loaded, 0);
    }else{
        getCommentsMaster(podcastId, 50, 0);
    }
}
function submitCommentFailed(errorMessage){
    console.log(errorMessage);
}



//#####################################//
//          LOGIN / SIGNUP             //
//#####################################//

// Prompt User For Login
function promptForLogin(){
    var nickname = $('#nickname');
    var container = $('#nickname-container');
    var usernameField = container.find('input[type=text]');
    var passwordField = container.find('input[type=password]');
    var cancelBtn = container.find('.cancel');
    var continueBtn = container.find('.continue');
    nickname.show();
    setTimeout(function (){
        usernameField.select(); }, 250);
    usernameField.on('change keyup paste', function (){
        var username = usernameField.val();
        var password = passwordField.val();
        if(username.length > 4){
            if(password.length > 5){
                continueBtn.css('color', 'lightgrey');
            }
            else{
                continueBtn.css('color', 'grey');
            }
            usernameField.css('color', stringToColor(username));
        }
        else{
            continueBtn.css('color', 'grey');
            usernameField.css('color', 'lightgrey');
        }
    });
    passwordField.on('change keyup paste', function (){
        var username = usernameField.val();
        var password = passwordField.val();
        if(username.length > 4){
            if(password.length > 5){
                continueBtn.css('color', 'lightgrey');
            }
            else{
                continueBtn.css('color', 'grey');
            }
        }
        else{
            continueBtn.css('color', 'grey');
            usernameField.css('color', 'lightgrey');
        }
    });
    continueBtn.on('click', function (){
        var usernameV = usernameField.val();
        var passwordV = passwordField.val();
        if(usernameV.length > 4 && passwordV.length > 5){
            passwordV = CryptoJS.MD5(passwordV).toString();

            var pageUrl = '/action/login/';
            $.ajax({
                type: 'POST',
                url: pageUrl,
                data: { password: passwordV, username: usernameV, csrfmiddlewaretoken: window.CSRF_TOKEN },
                dataType: 'json',
                success: function (data) {
                    if(data.status == 'success'){
                        var pageUrl = '/action/request-token/';
                        $.ajax({
                            type: 'GET',
                            url: pageUrl,
                            dataType: 'json',
                            success: function (datatwo) {
                                if(datatwo.status == 'success'){
                                    $('#nickname').hide();
                                    $('#nickname .error').hide();
                                    window.username = usernameV;
                                    window.CSRF_TOKEN = datatwo.newToken;
                                    $('#username-preview').text('[ ' + usernameV + ' ]');
                                    window.authenticated = true;
                                    $('#wrapper').addClass('authenticated');
                                    $('.comment-input').select();
                                }
                                else{
                                    location.reload();
                                }
                            },
                            error: function (error){
                                location.reload();
                            }
                        });
                    }
                    else{
                        $('#nickname .error').show();
                        $('#nickname .error').text(data.reason);
                        $('#nickname-container input[type=text]').focus();
                    }
                },
                error: function (error){
                    console.log(error);
                }
            });
        }

    });
    cancelBtn.on('click', function (){
        $('#nickname').hide();
    });
}

// Check If Logged In
function isLoggedIn(){
    return window.authenticated;
}


//#####################################//
//              USER DATA              //
//#####################################//

function getUserData(podcastId){

    return userdatas[podcastId]
}
function storeNewUserData(podcastId, userData){

    userdatas[podcastId] = userData;
}


//#####################################//
//             WEB ACTIONS             //
//#####################################//

// Request new copy of current csrf token
function waRequestNewToken(){
    var pageUrl = '/action/request-token/';
    $.ajax({
        type: 'GET',
        url: pageUrl,
        dataType: 'json',
        success: function (data) {
            if(data.status == 'success'){
                window.CSRF_TOKEN = data.newToken;
            }
            else{
                location.reload();
            }
        },
        error: function (error){
            location.reload();
        }
    });
}

// Request specific UserData related to podcast
function waRequestUserData(podcastId){
    var pageUrl = 'data/get-specific/user-data/' + podcastId + '/';
    $.ajax({type: 'GET',url: pageUrl,dataType: 'json',
        success: function (data) {
            if(data.status == 'success'){
                storeNewUserData(podcastId, data.userData);
            }
        },
        error: function (error){console.log(error);}
    });
}

// Request specific UserData related to podcast then update master comments
function waRequestUserDataProcComments(podcastId){
    var pageUrl = 'data/get-specific/user-data/' + podcastId + '/';
    $.ajax({type: 'GET',url: pageUrl,dataType: 'json',
        success: function (data) {
            if(data.status == 'success'){
                storeNewUserData(podcastId, data.userData);
                getCommentsMaster(podcastId, max_comments_intial, 0);
            }
        },
        error: function (error){console.log(error);}
    });
}

// Request All Podcast Data Snippet
function waRequestAllPodcastData(){
    var pageUrl = '/data/get-all/podcasts/';
    togglePodcastLoadScreen(true);
    $.ajax({
        type: 'GET',
        url: pageUrl,
        dataType: 'json',
        success: function (data) {
            podcasts = data.podcasts;
            updatePodcastView();
        },
        error: function (error){
            console.log(error);
        }
    });
}

// Request specific Podcast Data from podcastId
function waRequestSpecificPodcastData(podcastId){
    var pageUrl = '/data/get-specific/podcast/' + podcastId + '/';
    $.ajax({
        type: 'GET',
        url: pageUrl,
        dataType: 'json',
        success: function (data) {
            if(data.podcast !== undefined && data.podcast != null){
                podcasts[data.podcast.id] = data.podcast;
                var podcast = $('#podcast-' + data.podcast.id);
                if(podcast !== undefined){
                    var dataBar = podcast.find('.data-bar');
                    dataBar.find('.score-total').text(nFormatter(data.podcast.score), 1);
                    dataBar.find('.comment-total').text(nFormatter(data.podcast.comments), 1);
                }
            }
        },
        error: function (error){
            console.log(error);
        }
    });
}

// Submit Comment
function waSubmitComment(podcastId, userId, commentText, parentId=0, replyToId=0){
    var pageUrl = '/action/comment/{0}/{1}/{2}/'.format(podcastId, parentId, replyToId);
    var subComment = false;
    if(parentId != 0){subComment = true;}
    $.ajax({
        type: 'POST',
        url: pageUrl,
        data: { comment: commentText, user_id: userId, csrfmiddlewaretoken: window.CSRF_TOKEN },
        dataType: 'json',
        success: function (data) {
            if(data.status == 'success'){
                submitCommentSuccess(podcastId, data.commentId, parentId, replyToId, subComment);
            }else{
                submitCommentFailed(data.reason);
            }
        },
        error: function (error){
            console.log(error);
        }
    });
}

// Like Comment
function waLikeComment(commentId){
    var pageUrl = '/action/like/' + commentId + '/';
    $.ajax({type: 'GET',url: pageUrl,dataType: 'json',
        success: function (data) {
            if(data.status == 'success'){
                addLikeSuccess(commentId);
            }
            else{
                addLikeFailed(data.reason);
            }
        },
        error: function (error){console.log(error);}
    });
    gtag('event','comment_like', {
        "id": commentId
    });
}

// Dislike Comment
function waDislikeComment(commentId){
    var pageUrl = '/action/dislike/' + commentId + '/';
    $.ajax({type: 'GET',url: pageUrl,dataType: 'json',
        success: function (data) {
            if(data.status == 'success'){
                removeLikeSuccess(commentId);
            }
            else{
                removeLikeFailed(data.reason);
            }
        },
        error: function (error){console.log(error);}
    });
    gtag('event','comment_dislike', {
        "id": commentId
    });
}


//#####################################//
//            AUTO UPDATER : interval  //
//#####################################//

var autoUpdateInterval = 15; //seconds
var autoUpdaterRunning = false;
var autoInterval;

function startAutoUpdater(){
    stopAutoUpdater();
    autoUpdaterMech();
}
function stopAutoUpdater(){
    if(autoInterval != null){
        clearInterval(autoInterval);
    }
    autoUpdaterRunning = false;
}
function autoUpdaterMech(){
    autoUpdaterRunning = true;
    autoInterval = setInterval(function(){
        autoUpdateCall();
    }, autoUpdateInterval * 1000);
}
function autoUpdateCall(){
    updateCurrentPodcastData();
    updateCommentTimes();
}


//#####################################//
//         HELPFUL FUNCTIONS           //
//#####################################//

// Get Podcast Id from Podcast Element
function getPodcastId(podcastElement){
    if(podcastElement != undefined){
        return parseInt(podcastElement.attr('id').split('-')[1]);
    }
    return 0;
}

// Format String
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

// Get Time Since DateTime
function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + "y";
    }
    interval = seconds / 604800;
    if (interval > 1) {
        return Math.floor(interval) + "w";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + "d";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + "h";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + "m";
    }
    return Math.floor(seconds) + "s";
}


//#####################################//
//             ALL EVENTS              //
//#####################################//

// Register Page Events
function registerPageEvents(){
    $(document).on('click', '#logout-button', function (){
        var pageUrl = '/action/logout/';
        $.ajax({
            type: 'GET',
            url: pageUrl,
            dataType: 'json',
            success: function (data) {
                if(data.status == 'success'){
                    $('#wrapper').removeClass('authenticated');
                    window.username = '';
                    window.authenticated = false;
                    waRequestNewToken();
                }
                else{
                }
            },
            error: function (error){
                console.log(error);
            }
        });
    });
    $(document).on('change', '#search-bar', function(){
        search = $('#search-bar').val().toString();
    });
    $(document).on('click', '#search-submit', function(){
        if($('#search-submit').val() == 'CLEAR'){
            search = '';
            currentSearch = '';
            $('#search-submit').val('SEARCH');
            updatePodcastView();
        }
        else{
            search = $('#search-bar').val();
            if(search.length > 0){
                updatePodcastView();
                gtag('event','search_podcasts', {
                    "search": search
                });
            }
        }
    });
    $(document).on('change', '#sort', function(){
        var newSort = $('#sort').val();
        if(sort != newSort){
            sort = newSort;
            updatePodcastView();
        }
    });
    $(document).on('click', '#nickname', function(e){
        e.stopPropagation();
    });
    $(document).on('click', '.copy-to-clipboard', function(){
        var link = $(this);
        var data = link.attr('address-data');
        var notify = link.find('.copy-notify');

        navigator.clipboard.writeText(data.toString());
        link.css('color', '#000');
        notify.css('opacity', 1);
        setTimeout(function(){
            link.css('color', 'grey');
            notify.css('opacity', 0);
        }, 1000);
    });
    $('#container').scroll(function(){
        var container = $('#container');
        var podHeight = $('.podcast').height();
        var scrollTop = container.scrollTop();
        var scrollHeight = container[0].scrollHeight;
        var tollerance = 10;

        //Load More If Hit Bottom
        if(scrollTop + container.height() >= scrollHeight - tollerance){
            if(!hitBottom){
                hitBottom = true;
                loadMorePodcasts();
            }
        }

        //Clear Bottom If Scrolling Up
        var currentObjIndex = parseInt((scrollTop / ((podHeight / 5) * 6.5)) + ' ');
        if(lastObjIndex != currentObjIndex){
            var scrollingDown = false;
            if(lastObjIndex < currentObjIndex){
                scrollingDown = true;
            }
            var amountToClear = (clearAwayObjects * 2) * -1;
            if(!scrollingDown && currentObjIndex - objectsLoaded < amountToClear){
                shouldClearStrength += 1;
                checkIfShouldClear();
            }
            lastObjIndex = currentObjIndex;
        }

        //console.log('ScrollTop: ' + scrollTop + ' ScrollHeight: ' + scrollHeight + ' ElHeight: ' + objectsLoaded + ' EstCount: ' + currentObjIndex);
    });
}

// Register Podcast Events
function registerPodcastEvents(){
    $(document).on('click', '.podcast-click', function(){
        var parent = $(this).parent();
        if (!parent.hasClass('extended')){
            $('#container').css('scroll-snap-type', 'none');
            turnOn(parent);
            setTimeout(function (){
                $('#container').css('scroll-snap-type', 'y mandatory');
            }, 1000);
        }
    });
    $(document).on('click', '.close', function(){
        var parent = $(this).parent();
        if(parent.hasClass('extended')){
            turnOff(parent);
            removeFromOpened(parent);
        }
    });
    $(document).on('click', '.play', function(){
        var podcast = $(this).parent();
        var podcastId = getPodcastId(podcast)
        var playbtn = podcast.find('.play i');
        if(playbtn != undefined && playbtn.hasClass('fa-play')){
            playbtn.removeClass('fa-play');
            playbtn.addClass('fa-close');
            enablePlayer(podcastId);
        }
        else if(playbtn != undefined){
            playbtn.removeClass('fa-close');
            playbtn.addClass('fa-play');
            disablePlayer();
        }

    });
    $(document).on('click', '.player-expand', function(){
        var podcastId = $(this).parent().attr('id').split('-')[1];
        expandPlayer(podcastId);
    });
    $(document).on('click', '#playing-prompt .yes', function(){
        $('#playing-prompt').css('opacity', 0);
        $('#playing-prompt').css('pointer-events', 'none');
    });
    $(document).on('click', '#playing-prompt .no', function(){
        disablePlayer();
        $('#playing-prompt').css('opacity', 0);
        $('#playing-prompt').css('pointer-events', 'none');
    });
}

// Register Comment Events
function registerCommentEvents(){
    // Check and Ask for Nickname
    $(document).on('click', '.comment-input', function(){
        if(!isLoggedIn()){
            promptForLogin();
        }
    });
    //Submit Comment
    $(document).on('click', '.comment-submit', function(){
        var podcast = $(this).parent().parent().parent();
        if(podcast == null){return}
        var podcastId = podcast.attr('id').split('-')[1];
        var comment_input = podcast.find('.comment-input');
        var comment_text = comment_input.html();
        var pop = comment_input.find('.pop');
        if(pop != undefined){
            comment_text = comment_text.replace(pop.prop('outerHTML'), "");
        }
        var masterId = currentReplyId;
        var user_id = 0;
        if(masterId !== 0){
            masterId = $('#' + currentReplyId).attr('masterId');
            if(masterId == undefined){
                masterId = 0;
            }
        }
        submitComment(podcastId, user_id, comment_text, masterId, currentReplyId);
    });
    $(document).on('keypress','.comment-input', function (e) {
        if(e.which === 13 && !e.shiftKey){
            var podcast = $(this).parent().parent().parent();
            $(this).attr("disabled", "disabled");
            var podcastId = podcast.attr('id').split('-')[1];
            var comment_input = podcast.find('.comment-input');
            var comment_text = comment_input.html();
            var pop = comment_input.find('.pop');
            if(pop != undefined){
                comment_text = comment_text.replace(pop.prop('outerHTML') + '&nbsp;', "");
            }
            var masterId = currentReplyId;
            var user_id = 0;
            if(masterId !== 0){
                masterId = $('#' + currentReplyId).attr('masterId');
                if(masterId == undefined){
                    masterId = 0;
                }
            }
            submitComment(podcastId, user_id, comment_text, masterId, currentReplyId);
            $(this).removeAttr("disabled");
        }
    });
    $(document).on('keydown', '.comment-input', function(){
        var commentInput = $(this);
        setTimeout(function(){
            if(commentInput.find('.pop').length == 0){
                currentReplyId = 0;
            }
        }, 500);
    });
    $(document).on('click', '.pop i', function(){
        $(this).parent().remove();
        currentReplyId = 0;
    });
    //When Types in Comment-Input
    $(document).on('change keyup paste', '.comment-input', function() {
        var totalLength = $(this).val().length;
        var commentInputWrap = $(this).parent();
        var podcast = commentInputWrap.parent().parent();
        commentInputWrap.find('.comment-max-char').text(totalLength);
        var currentVal = $(this).val().split('\n').length - navigator.userAgent.indexOf("MSIE");
        if(totalLength > 2){
            commentInputWrap.find('.submit').addClass('interactable');
        }
        else{
            commentInputWrap.find('.submit').removeClass('interactable');
        }
        if(currentVal > 2 || totalLength > 35){
            if(!podcast.hasClass('enlarge')){
                podcast.find('.comment').addClass('enlarge');
                podcast.find('.comments').addClass('enlarge-edit');
                podcast.find('.comments-wrap').addClass('enlarge-edit-wrap');
            }
        }
        else{
            if(podcast.hasClass('enlarge')){
                podcast.find('.comment').removeClass('enlarge');
                podcast.find('.comments').removeClass('enlarge-edit');
                podcast.find('.comments-wrap').removeClass('enlarge-edit-wrap');
            }
        }
    });
    //Like Comment
    $(document).on('click', '.com-like', function(){
        waLikeComment($(this).parent().parent().attr('id'));
    });
    //Disike Comment
    $(document).on('click', '.com-dislike', function(){
        waDislikeComment($(this).parent().parent().attr('id'));
    });
    //Extend Comments
    $(document).on('click', '.com-comment, .com-reply', function(){
        var comment = $(this).parent().parent();
        var isReplyBtn = ($(this).hasClass('com-reply'));
        console.log(isReplyBtn);
        if(comment != undefined){
            var commentId = comment.attr('id');
            var podcastId = comment.attr('podcastId');
            var name = comment.find('.com-name').text();
            if(comment.attr('replyToId') !== '0'){
                return
            }
            if(comment.attr('extended') !== 'yes'){
                getCommentsSub(commentId, 5, 0);
            }
            else if(!isReplyBtn){
                comment.attr('extended', 'no');
                comment.find('.com-subs').text('');
                comment.find('.com-sub-extend').hide();
                comment.find('.com-subs').css('padding-bottom', '0');
                comment.attr('loaded', 0);
                comment.find('.com-subs').css('border-top','none');
                comment.find('.com-subs').css('background','transparent');
            }

            //Extended Comment Analytic
            //commentId podcastId name
        }
    });
    //Set Reply
    $(document).on('click', '.com-reply', function(){
        var comment = $(this).parent().parent();
        if(comment != null){
            var commentId = comment.attr('id');
            var podcastId = comment.attr('podcastId');
            var name = comment.find('.com-name').text();
            var color = comment.find('.com-name').css('color');
            currentReplyId = commentId;
            setInputPop(podcastId, name,color);

            //Reply To Comment Analytic
            //commentId podcastId name
        }
    });
}

// Number Formatter
function nFormatter(num, digits) {
    num = parseInt(num);
    var si = [
        { value: 1, symbol: "" },
        { value: 1E3, symbol: "k" },
        { value: 1E6, symbol: "m" },
        { value: 1E9, symbol: "g" },
        { value: 1E12, symbol: "t" },
        { value: 1E15, symbol: "p" },
        { value: 1E18, symbol: "e" }
    ];
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    for (i = si.length - 1; i > 0; i--) {
        if (num >= si[i].value) {
            break;
        }
    }
    return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
}

// String to HEX Color
var stringToColor = function(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
}


//#####################################//
//          Loading Screen : interval  //
//#####################################//

var loadSequence;
function enableLoadSequence(){
    disableLoadSequence();
    var time = 0.5;
    LoadSequence(time);
    loadSequence = setInterval(function(){
        LoadSequence(time);
    }, time * 6000);
}
function disableLoadSequence(){
    if(loadSequence != null){
        clearInterval(loadSequence);
    }
}
function LoadSequence(time_seconds){
    JumpDot(1, time_seconds);
    setTimeout(function (){
        JumpDot(2, time_seconds);
    }, time_seconds * 2000);
    setTimeout(function (){
        JumpDot(3, time_seconds)
    }, time_seconds * 4000);
}
function JumpDot(element, time, jumpHeight=0.75, color='#969696'){
    element = $('.c-' + element);
    element.css('top', -jumpHeight + 'vh')
    element.css('background', color);
    setTimeout(function(){
        element.css('background', 'grey');
        element.css('top', 0);
    }, time * 1000);
}


