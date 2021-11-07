var max_allowed_opened = 1;
var max_podcasts_initial = 100;
var max_podcasts_loadin = 50;
var opened = [];
var podcasts = {};
var comment_cache = {};
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



var comment_com_bar_original = '<div class="com-bar">' +
    '<a class="com-dislike"><i class="fa fa-arrow-down"></i></a>' +
    '<a class="com-points">{5}</a>' +
    '<a class="com-like"><i class="fa fa-arrow-up"></i></a>' +
    '<a class="com-comment"><i class="far fa-comment"></i>{6}</a>' +
    '<a class="com-reply"><i class="fas fa-reply"></i>Reply</a></div>';

var comment_com_bar = '<div class="com-bar">' +
    '<a class="com-date">{11}</a>' +
    '<a class="com-like"><i class="fa fa-heart"></i><i class="fa fa-heart-broken"></i>{12}</a>' +
    '<a class="com-comment"><i class="far fa-comment"></i>{13}</a>' +
    '<a class="com-reply"><i class="fas fa-reply"></i>Reply</a></div>';


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
//13-'subCount'


var spotify_web_template = '<iframe' +
    'src="https://open.spotify.com/embed/episode/{0}?utm_source=generator" width="100%" height="232"' +
    'frameBorder="0" allowFullScreen=""' +
    'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>';

var sub_comment_template = '<div class="com-sub" id="{0}" podcastId="{5}" masterId="{6}" replyToId="{7}" date="{14}">' +
    '<a class="com-text">' +
    '<i class="com-name-wrap"><i class="fa fa-heart com-donor {3}"></i>' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{4}</a>' +
    comment_com_bar + '</div>';

var sub_comment_template_deep = '<div class="com-sub" id="{0}" podcastId="{5}" masterId="{6}" replyToId="{7}" date="{14}">' +
    '<a class="com-text">' +
    '<div class="com-reply-top">' +
    '<span class="com-name-reply" style="color:{2};">{1}</span>' +
    '<i class="fa fa-arrow-right split"></i>' +
    '<span class="com-name-reply" style="color:{9};">{8}</span></i></div>' +
    '<i class="com-name-wrap"><i class="fa fa-heart com-donor {3}"></i>' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{4}</a>' +
    comment_com_bar + '</div>';

var comment_template = '<div class="com" id="{0}" podcastId="{5}" masterId="{0}" replyToId="0" date="{14}">' +
    '<a class="com-text">' +
    '<i class="com-name-wrap"><i class="fa fa-heart com-donor {3}"></i>' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{4}</a>' +
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

$(document).ready(function(){
    if(!window.authenticated){
        askForNickname();
    }
    var time = 0.5;
    LoadSequence(time);
    setInterval(function(){
        LoadSequence(time);
    }, time * 6000);

    // First, checks if it isn't implemented yet.
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

    //Request podcast data
    getPodcastData();
    $('#top-bar').css('opacity','1');

    // Get Liked and Disliked Comments from Session
    if(window.liked != 'None'){
        liked = JSON.parse(window.liked);
    }
    else{
        liked = [];
    }
    if(window.disliked != 'None'){
        disliked = JSON.parse(window.disliked);
    }
    else{
        disliked = [];
    }
    registerPodcastEvents();

    //Open Podcast
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

    //Open Podcast
    $(document).on('click', '.podcast-click', function(){
        var parent = $(this).parent();
        if (!parent.hasClass('extended')){
            $('#container').css('scroll-snap-type', 'none');
            turnOn(parent);
            $(this).hide();
            setTimeout(function (){
                $('#container').css('scroll-snap-type', 'y mandatory');
            }, 1000);
        }
    });

    //Close Podcast
    $(document).on('click', '.close', function(){
        var parent = $(this).parent();
        if(parent.hasClass('extended')){
            turnOff(parent);
            removeFromOpened(parent);
        }
    });

    //Start the Auto Updater
    startAutoUpdater();

    //Search Functions
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

    $(document).on('click', '#nickname', function(e){
        e.stopPropagation();
    });
});


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
function JumpDot(element, time, jumpHeight=0.75, color='#969696'){
    element = $('.c-' + element);
    element.css('top', -jumpHeight + 'vh')
    element.css('background', color);
    setTimeout(function(){
        element.css('background', 'grey');
        element.css('top', 0);
    }, time * 1000);
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


// PODCAST DATA LOADING
function getPodcastData(){
    var pageUrl = '/data/get-all/podcasts/';
    showLoadingPodcastScreen(true);
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
function updatePodcastView(loadin=false){
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
function showLoadingPodcastScreen(visible){
    if(visible){
        $('#loading-podcast').show();
    }
    else{
        $('#loading-podcast').hide();
    }
}
function updateCurrentPodcastData(){
    if(opened.length > 0){
        for(i=0;i<opened.length;i++){
            var podcastId = opened[i].attr('id').split('-')[1];
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
    }
}


// PODCAST - ON / OFF
function turnOn(podcast){
    var podcastId = podcast.attr('id').split('-')[1];
    var podcastData = podcasts[podcastId];
    var content = podcast.find('.content');

    var removal = 0;
    if(opened.length >= max_allowed_opened){
        removal = clearOpened(podcast);
    }
    scrollTo(podcast, removal);



    // SET CONTENT
    content.text('');

    // Create Data Bar
    var date = new Date(podcastData.date);
    date = date.getMonth() + '/' + date.getDay() + '/' + date.getFullYear().toString().substr(2);

    content.append(dataBar.format(date, podcastData.duration, podcastData.score, podcastData.comments));

    // Create Comment Wrap
    content.append(commentsWrapTemplate);

    // Create Comment Input
    content.append(commentInputTemplate);

    podcast.addClass('extended');
    podcast.find('.duration-preview').css('opacity', 0);
    podcast.find('.data-bar').css('opacity', 1);
    podcast.find('.close').css('opacity', 1);
    podcast.find('.play').css('opacity', 1);
    podcast.find('.comment-max-char').text('0');
    podcast.find('.name').css('max-width', '51%');
    podcast.find('.comment-input').on("change keyup paste", function() {
        var totalLength = $(this).val().length;
        podcast.find('.comment-max-char').text(totalLength);
        var currentVal = $(this).val().split('\n').length - navigator.userAgent.indexOf("MSIE");
        if(totalLength > 2){
            podcast.find('.submit').addClass('interactable');
        }
        else{
            podcast.find('.submit').removeClass('interactable');
        }

        if(currentVal > 2 || totalLength > 35){
            if(!podcast.find('.comment').hasClass('enlarge')){
                podcast.find('.comment').addClass('enlarge');
                podcast.find('.comments').addClass('enlarge-edit');
                podcast.find('.comments-wrap').addClass('enlarge-edit-wrap');
            }
        }
        else{
            if( podcast.find('.comment').hasClass('enlarge')){
                podcast.find('.comment').removeClass('enlarge');
                podcast.find('.comments').removeClass('enlarge-edit');
                podcast.find('.comments-wrap').removeClass('enlarge-edit-wrap');
            }
        }
    });
    getCommentsMaster(podcastId, 50, 0);
    opened.push(podcast);
    setTimeout(function (){
        $('#container').css('overflow', 'hidden');
    },1000);
    gtag('event','open_podcast', {
        "id": podcastId,
        "name": podcastData[1]
    });
}
function turnOff(podcast){
    if(playing){
        $('.playing-prompt').css('opacity', 1);
        $('.playing-prompt').css('pointer-events', 'auto');
    }
    var podcastId = podcast.attr('id').split('-')[1];
    var podcastData = podcasts[podcastId];
    podcast.removeClass('extended');
    podcast.find('.duration-preview').css('opacity', 1);
    podcast.find('.close').css('opacity', 0);
    podcast.find('.play').css('opacity', 0);
    podcast.find('.data-bar').css('opacity', 0);
    podcast.find('.name').css('max-width', '63%');
    podcast.find('.podcast-click').show();
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

// PLAYER
function enablePlayer(podcastId){
    $('.player').attr('src', playerSrc.format(podcasts[podcastId].spotify));
    $('#podcast-' + podcastId).addClass('currently-playing');
    $('#top-bar').css('opacity', 0);
    currentPlayingGlow(podcastId);
    setTimeout(function (){
        var playerBar = $('#player-bar');
        var topBar = $('#top-bar');
        $('#top-bar').hide();
        playerBar.show();
        playerBar.css('opacity','0.75');
    }, 500);
    playing = true;
    playingId = podcastId;
}
function disablePlayer(){
    $('#player-bar').css('opacity', 0);
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
function currentPlayingGlow(podcastId){
    $('#podcast-' + podcastId).css('transition', 'height ease 0.5s, border ease 4s');
    currentPlayingGlowInterval = setInterval(function (){
        $('#podcast-' + podcastId).addClass('currently-playing');
        setTimeout(function (){
            $('#podcast-' + podcastId).removeClass('currently-playing');
        }, 2500);
    },4000);
}



// NICKNAME
function askForNickname(){
    var nickname = $('#nickname');
    var container = $('#nickname-container');
    var usernameField = container.find('input[type=text]');
    var passwordField = container.find('input[type=password]');
    var cancelBtn = container.find('.cancel');
    var continueBtn = container.find('.continue');

    nickname.show();
    usernameField.focus();
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
                        $('#nickname').hide();
                        $('#nickname .error').hide();
                        window.username = usernameV;
                        $('#username-preview').text('[ ' + usernameV + ' ]');
                        window.authenticated = true;
                        $('#wrapper').addClass('authenticated');

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

// COMMENT UPDATING
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
        updateComment(comment.id);
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
        comment.name,
        stringToColor(comment.name),
        comment.donor,
        comment.comment,
        comment.podcast,
        comment.master,
        comment.replyToId,
        comment.replyToName,
        stringToColor(comment.replyToName),
        comment.user,
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

// COMMENT - Like / Dislike
function hasLiked(id) {
    var hasliked = false;
    $.each(liked, function (index, commentId){
        if(commentId == id){
            hasliked = true;
        }
    });
    return hasliked;
}
function hasDisliked(id) {
    var hasdisliked = false;
    $.each(disliked, function (index, commentId){
        if(commentId == id){
            hasdisliked = true;
        }
    });
    return hasdisliked;
}
function removeLikeComment(id){
    var new_liked = [];
    $.each(liked, function (comment_id){
        if(comment_id != id){
            new_liked.push(comment_id);
        }
    });
    liked = new_liked;
}
function removeDislikeComment(id){
    var new_disliked = [];
    $.each(disliked, function (comment_id){
        if(comment_id != id){
            new_disliked.push(comment_id);
        }
    });
    disliked = new_disliked;
}
function updateComment(id){
    var likeBtn = $('#' + id).find('.com-like');
    var dislikeBtn = $('#' + id).find('.com-dislike');
    if(hasLiked(id)){
        likeBtn.addClass('liked');
        dislikeBtn.removeClass('disliked');
    }
    else if(hasDisliked(id)){
        likeBtn.removeClass('liked');
        dislikeBtn.addClass('disliked');
    }
    else{
        likeBtn.removeClass('liked');
        dislikeBtn.removeClass('disliked');
    }
}

// COMMENT - Actions
function submitComment(podcastId, userId, commentText, parentId=0, replyToId=0){
    if(commentText.length > 1){
        var subComment = false;
        var podcast = $('#podcast-' + podcastId);
        if(parentId != 0){subComment = true;}
        var pageUrl = '/action/comment/' + podcastId + '/' + parentId + '/' + replyToId + '/';
        $.ajax({
            type: 'POST',
            url: pageUrl,
            data: { comment: commentText, user_id: userId, csrfmiddlewaretoken: window.CSRF_TOKEN },
            dataType: 'json',
            success: function (data) {
                var status = data.status;
                var reason = data.reason;
                if(status == 'success'){
                    clearTextInput(podcastId);
                }
                else{
                    console.log('Submmit Comment Failed: ' + reason);
                }
                if(subComment){
                    var loaded = $('#' + parentId).attr('loaded');
                    if(loaded == undefined){
                        return
                    }
                    if(loaded === 'NaN' || loaded === '0' || loaded < 5){
                        loaded = 5;
                    }
                    console.log(loaded);
                    getCommentsSub(parentId, loaded, 0);
                }
                else{
                    getCommentsMaster(podcastId, 50, 0);
                }
            },
            error: function (error){
                console.log(error);
            }
        });
        gtag('event','comment_submit', {
            "id": podcastId
        });
    }
}

// ADDITIONAL
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

// REGISTER PODCAST EVENTS
function registerPodcastEvents(){
    // Check and Ask for Nickname
    $(document).on('click', '.comment-input', function(){
        if(!window.authenticated){
            askForNickname();
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


    //Like Comment
    $(document).on('click', '.com-like', function(){
        var comment = $(this).parent().parent();
        var commentId = comment.attr('id');
        var pageUrl = '/action/like/' + commentId + '/';
        if(!hasLiked(commentId)){
            wasDisliked = false;
            if(hasDisliked(commentId)){
                removeDislikeComment(commentId);
                wasDisliked = true;
            }
            $.ajax({
                type: 'GET',
                url: pageUrl,
                dataType: 'json',
                success: function (data) {
                    liked.push(commentId);
                    updateComment(commentId);
                    var points = comment.find('.com-like').text();
                    if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
                    }else{
                        points = parseInt(points);
                        points += 1;
                        if(wasDisliked){
                            points += 1;
                        }
                        comment.find('.com-like').html('<i class="fa fa-heart"></i><i class="fa fa-heart-broken"></i>' + nFormatter(points, 1));
                    }
                },
                error: function (error){
                    console.log(error);
                }
            });

            gtag('event','comment_like', {
                "id": commentId
            });
        }
        else{
            removeLikeComment(commentId);
            updateComment(commentId);
            var points = comment.find('.com-like').text();
            console.log(points);
            if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
            }else{
                points = parseInt(points);
                points -= 1;
                comment.find('.com-like').html('<i class="fa fa-heart"></i><i class="fa fa-heart-broken"></i>' + nFormatter(points, 1));
            }
        }
    });

    //Disike Comment
    $(document).on('click', '.com-dislike', function(){
        var comment = $(this).parent().parent();
        var commentId = comment.attr('id');
        var pageUrl = '/action/dislike/' + commentId + '/';
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

            gtag('event','comment_dislike', {
                "id": commentId
            });
        }
        else{
            removeDislikeComment(commentId);
            updateComment(commentId);
            var points = comment.find('.com-points').text();
            if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
            }else{
                points = parseInt(points);
                points += 1;
                comment.find('.com-points').text(nFormatter(points, 1));
            }
        }
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

    $(document).on('click', '.play', function(){
        var podcastId = $(this).parent().attr('id').split('-')[1];
        enablePlayer(podcastId);
    });
    $(document).on('click', '.playing-prompt .yes', function(){
        $('.playing-prompt').css('opacity', 0);
        $('.playing-prompt').css('pointer-events', 'none');
    });
    $(document).on('click', '.playing-prompt .no', function(){
        disablePlayer();
        $('.playing-prompt').css('opacity', 0);
        $('.playing-prompt').css('pointer-events', 'none');
    });
    $('#logout-button').on('click', function (){
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
                    console.log('logged out');
                }
                else{
                }
            },
            error: function (error){
                console.log(error);
            }
        });
    });
}

// COMMENT INPUT
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

// AUTO UPDATING
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




