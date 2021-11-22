//<editor-fold desc="GLOBAL VARIABLES">
var max_podcasts_initial = 20;
var max_podcasts_loadin = 20;
var max_comments_intial = 20;
var can_load_in_podcasts = true;
var can_load_in_comments = true;


var opened = 0;
var lastOpened = 0;
var podcasts = {};
var loaded_podcasts = [];
var comment_cache = {};
var userdatas = {};
var liked;
var disliked;
var canClick = true;
var search = '';
var lastSearch = '';
var sort = 'popular';
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

var commentsLoaded = 5;
var currentReplyId = 0;
//</editor-fold>

//<editor-fold desc="HTML TEMPLATES">
var comment_com_bar = '<div class="com-bar">' +
    '<a class="com-date">{9}</a>' +
    '<a class="com-like"><i class="icon-heart"></i>{10}</a>' +
    '<a class="com-comment"><i class="icon-comment"></i>{11}</a>' +
    '<a class="com-reply"><i class="icon-reply"></i>Reply</a></div>';
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
    '<i class="com-name-wrap">' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{3}</a>' +
    comment_com_bar + '</div>';

var sub_comment_template_deep = '<div class="com-sub" id="{0}" podcastId="{4}" masterId="{5}" replyToId="{6}" date="{12}">' +
    '<a class="com-text">' +
    '<div class="com-reply-top">' +
    '<span class="com-name-reply" style="color:{2};">{1}</span>' +
    '<i class="icon-arrow-right split"></i>' +
    '<span class="com-name-reply" style="color:{8};">{7}</span></i></div>' +
    '<i class="com-name-wrap">' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{3}</a>' +
    comment_com_bar + '</div>';

var comment_template = '<div class="com" id="{0}" podcastId="{4}" masterId="{5}" replyToId="6" date="{12}" subCount="{13}">' +
    '<a class="com-text">' +
    '<i class="com-name-wrap">' +
    '<span class="com-name" style="color:{2};">{1}</span></i>' +
    '{3}<span class="text-place"></span></a>' +
    comment_com_bar +
    '<div class="com-subs"></div></div>';

var name_wrap_template = '<i class="com-name-wrap"><span class="com-name" style="color:{0};">{1}</span></i>';


var dataBar = '<div class="data-bar"><a><i class="icon-calendar-alt"></i><span>{0}</span></a>' +
    '<a><i class="icon-clock"></i><span>{1}</span></a>' +
    '<a><i class="icon-heart"></i><span class="score-total">{2}</span></a>' +
    '<a><i class="icon-comment"></i><span class="comment-total">{3}</span></a></div>';

var commentInputTemplate = '<div class="commenter"><a class="comment-max-char">0</a>' +
    '<a class="comment-input" contenteditable="true"></a>' +
    '<input class="comment-submit" type="submit" value="">' +
    '<i class="icon-arrow-right submit"></i></div>';

var commentsWrapTemplate = '<div class="comments-wrap"><div class="coms"></div></div>';

var podcastTemplate = '<div class="pod" id="podcast-{0}" podcastId="{0}"><a class="id">{0}</a><a class="name">{1}</a><a class="dur">{2}</a></div>'
//</editor-fold>

//<editor-fold desc="STARTUP">
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
//</editor-fold>

//<editor-fold desc="EMBEDDED PLAYER">

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
//</editor-fold>

//<editor-fold desc="PODCAST DATA">

// Get All Podcast Data
function getPodcastData(){
    $('#pods-wrap').addClass('locked');
    waRequestAllPodcastData();
}

// Update Podcast Viewport with Data
function updatePodcastView(loadin=false){
    var pods = $('#pods');
    $('#pods-wrap').removeClass('locked');
    var amountToAdd = max_podcasts_initial;
    if(loadin){
        amountToAdd = max_podcasts_loadin;
    }
    else{
        addonOffset = 0;
        objectsLoaded = 0;
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
        $('.search-submit').text('CLEAR');
        view = view.filter(function(element){
            lastSearch = search;
            if(element.id.toString().includes(searchTemp) || element.name.toUpperCase().includes(searchTemp)){
                return true;
            }
        });
    }
    //Apply Limit
    view = view.slice(addonOffset, amountToAdd + addonOffset);
    addonOffset += amountToAdd;
    drawPodcastsToViewport(pods, view, loadin);
}

// Draw to Podcast Viewport
function drawPodcastsToViewport(pods, podcastData, loadin = false){
    var existingPods = pods.children();
    var existingCount = existingPods.length;
    var dataCount = podcastData.length;

    toggleLoadRing(false);

    if(loadin){
        $.each(podcastData, function (index, podcast){
            pods.append(podcastTemplate.format(podcast.id, podcast.name, podcast.duration));
            objectsLoaded += 1;
        });
        $('#pods .pod').addClass('populated');
    }
    else if(existingCount > dataCount){
        var count = 0;
        $.each(podcastData, function(index, podcast){
            var pod = $(existingPods[count]);
            pod.find('.id').text(podcast.id);
            pod.find('.name').text(podcast.name);
            pod.find('.dur').text(podcast.duration);
            pod.attr('id', 'podcast-' + podcast.id);
            pod.attr('podcastId', podcast.id);
            count += 1;
        });
        for(x=count;x<existingCount;x++){
            existingPods[x].remove();
            objectsLoaded -= 1;
        }
        $('#pods .pod').addClass('populated');
    }
    else if(existingCount < dataCount){
        if(existingCount > 0){
            var count = 0;
            $.each(podcastData, function(index, podcast){
                if(count < existingCount){
                    var pod = $(existingPods[count]);
                    pod.find('.id').text(podcast.id);
                    pod.find('.name').text(podcast.name);
                    pod.find('.dur').text(podcast.duration);
                    pod.attr('id', 'podcast-' + podcast.id);
                    pod.attr('podcastId', podcast.id);
                    count += 1;
                }
                else{
                    pods.append(podcastTemplate.format(podcast.id, podcast.name, podcast.duration));
                    objectsLoaded += 1;
                }
            });
        }
        else{
            pods.text('');
            $.each(podcastData, function (index, podcast){
                pods.append(podcastTemplate.format(podcast.id, podcast.name, podcast.duration));
                objectsLoaded += 1;
            });
        }
        $('#pods .pod').addClass('populated');
    }
    else{
        var count = 0;
        $.each(podcastData, function(index, podcast){
            var pod = $(existingPods[count]);
            pod.find('.id').text(podcast.id);
            pod.find('.name').text(podcast.name);
            pod.find('.dur').text(podcast.duration);
            pod.attr('id', 'podcast-' + podcast.id);
            pod.attr('podcastId', podcast.id);
            count += 1;
        });
        $('#pods .pod').addClass('populated');
    }
    loaded_podcasts = $('#pods').children().toArray();
    hideAllPodcastsExceptVisible();
}

function podcastDataFormat(template, podcast){
    return template.format(podcast.id, podcast.name, podcast.duration, podcast.date, podcast.comments, podcast.score, podcast.popularity);
}

function updateCurrentPodcastData(){
    if(opened[0] != null && opened[0] != undefined){
        waRequestSpecificPodcastData(getPodcastId(opened[0]));
    }
}

function podcastLoadUnload(lastVisible){
    if(objectsLoaded <= lastVisible + (max_podcasts_initial / 2)){
        if(can_load_in_podcasts){
            updatePodcastView(true);
            can_load_in_podcasts = false;
            setTimeout(function(){
                can_load_in_podcasts = true;
            }, 500);
        }
    }else if (objectsLoaded > lastVisible + (max_podcasts_initial * 2)){
        $('#container > .podcast').slice(-max_podcasts_initial).remove();
        objectsLoaded -= max_podcasts_initial;
    }
}


//</editor-fold>

//<editor-fold desc="PODCASTS">

// Enable/Disable Podcast Loading Screen
function toggleLoadRing(visible){
    if(visible){
        $('#load').addClass('enabled');
    }
    else{
        $('#load').removeClass('enabled');
    }
}

// PODCAST - ON / OFF
function turnOn(podcast){
    var podcastId = getPodcastId(podcast);
    var podcastData = podcasts[podcastId];

    // Close Opened Podcasts
    if(lastOpened !== 0 && lastOpened !== podcastId){
        clearOpened();
    }


    //Scroll to This Podcast
    scrollTo(podcast);

    // Player
    //var playbtn = podcast.find('.play i');
    //if(playbtn != undefined && playing){
     //   var play = podcast.find('.play');
       // if(playingId === podcastId){
       //     playbtn.removeClass('fa-play');
     //       playbtn.addClass('fa-close');
        //}
        //else{
           // playbtn.addClass('fa-play');
            //playbtn.removeClass('fa-close');
        //}
    //}
    //else if(playbtn != undefined){
      //  playbtn.addClass('fa-play');
    //}

    // BUILD PODCAST
    var passiveUpdate = true;
    var content = podcast.find('.content');
    if(content.length == 0){
        podcast.append('<div class="content"><i class="icon-times close"></i></div>');
        content = podcast.find('.content');
        var date = new Date(podcastData.date);
        date = date.getMonth() + '/' + date.getDay() + '/' + date.getFullYear().toString().substr(2);
        content.append(dataBar.format(date, podcastData.duration, nFormatter(podcastData.score), nFormatter(podcastData.comments)));
        content.append(commentsWrapTemplate);
        var comments = content.find('.coms');
        comments.append(comment_template + comment_template + comment_template + comment_template + comment_template);
        content.append(commentInputTemplate);
        passiveUpdate = false;
    }
    content.removeClass('hidden');
    // EXTEND PODCAST
    podcast.addClass('extended');
    // Check if Logged In
    if(passiveUpdate){
        //Just update loaded content :) That cant be that hard right?
        performPassiveUpdate();console.log('check2');
    }
    else{
        if(isLoggedIn()){
            // Grab Podcast Specific UserData then Get Comments For This Podcast
            toggleLoadRing(true);
            waRequestUserDataProcComments(podcastId)
        }else{
            // Get Comments For This Podcast
            toggleLoadRing(true);
            getCommentsMaster(podcastId, max_comments_intial, 0);
        }
    }

    // Lock the Podcast Viweport
    setTimeout(function (){
        $('#pods-wrap').addClass('locked');
    },500);

    // Google Analytics
    if(window.analytics){
        gtag('event','open_podcast', {
            "id": podcastId,
            "name": podcastData[1]
        });
    }
    commentsLoaded = 5;
    opened = podcastId;
    $('.coms').scroll(function(){
        var scroll = $(this).scrollTop() + $(this).innerHeight();
        var bottom = $(this)[0].scrollHeight - 100;
        if(can_load_in_comments && scroll > bottom){
            can_load_in_comments = false;
            getCommentsMaster(podcastId, max_comments_intial, commentsLoaded);
            console.log('loading more comments');
            setTimeout(function(){ can_load_in_comments = true; }, 1000);
        }
    });
}
function turnOff(podcast){
    //if(playing){
        //$('#playing-prompt').css('opacity', 1);
        //$('#playing-prompt').css('pointer-events', 'auto');
    //}
    var podcastId = getPodcastId(podcast);
    // Un-Extend Podcast
    podcast.removeClass('extended');
    toggleLoadRing(false);
    var content = podcast.find('.content');
    if(content.length != 0){
        content.addClass('hidden');
    }

    // Unlock Podcast Viewport
    $('#pods-wrap').removeClass('locked');
    //scrollTo(podcast);
    // Google Analytics
    if(window.analytics) {
        gtag('event', 'close_podcast', {
            "id": podcastId,
            "name": podcastData[1]
        });
    }
    lastOpened = opened;
    opened = 0;
}

function clearOpened(){
    console.log(lastOpened);
    $('#podcast-' + lastOpened + ' .content.hidden').remove();
}
function scrollTo(selector) {
    var offset = selector.offset();
    var $main = $('#pods-wrap');
    var vh = ($(window).height() / 100) * 1.5;
    $main.animate({
        scrollTop: offset.top - ($main.offset().top - $main.scrollTop()) - vh
    }, "fast");
}

function performPassiveUpdate(){
    var coms = $('.com .populated');
    if(coms.length > 0){
        console.log('check');
    }
    else if (opened != 0){
        getCommentsMaster(opened, max_podcasts_initial, 0);
    }
}

//</editor-fold>

//<editor-fold desc="COMMENTING">

// Comment Updating
function getCommentsMaster(podcastId, amount, offset, scrollTo=0){
    var pageUrl = '/data/master/' + podcastId + '/comments/' + amount + '/' + offset + '/';
    if(window.authenticated){
        pageUrl = '/data/master/' + podcastId + '/comments/' + amount + '/' + offset + '/' + window.username + '/';
    }
    var comments = []
    $.ajax({
        type: 'GET',
        url: pageUrl,
        dataType: 'json',
        success: function (data) {
            var loadCount = Object.keys(data.comments).length;
            drawCommentsToViewport(podcastId,data.comments, loadCount, offset, scrollTo);
        },
        error: function (error){
            console.log(error);
        }
    });
}
function getCommentsSub(commentId, amount, offset){
    toggleLoadRing(true);
    var pageUrl = '/data/sub/' + commentId + '/comments/' + amount + '/' + offset + '/';
    if(window.authenticated){
        pageUrl = '/data/sub/' + commentId + '/comments/' + amount + '/' + offset + '/' + window.username + '/';
    }
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
            else{/*
                comment.attr('extended', 'no');
                comment.find('.com-subs').text('');
                comment.find('.com-sub-extend').hide();
                comment.find('.com-subs').css('padding-bottom', '0');
                comment.attr('loaded', 0);
                comment.find('.com-subs').css('border-top','none');
                comment.find('.com-subs').css('background','transparent');*/
            }
            drawSubCommentsToViewport(commentId,data.comments, comments_length, data.comments_total, offset);
            disableCommentLoadBar(commentId);toggleLoadRing(false);

        },
        error: function (error){
            console.log(error);
        }
    });
}


function drawCommentsToViewport(podcastId, commentData, loadCount, offset, scrollTo=0){
    var podcast = getPodcast(podcastId);
    if(podcast !== undefined){
        var content = podcast.find('.coms');
        var existingComs = content.children();
        var existingCount = existingComs.length;
        toggleLoadRing(false);

        if(offset === 0){
            if(existingCount > loadCount){
                var count = 0;
                // Re-populate Existing Coms with Data
                $.each(commentData, function(index, comment){
                    var com = $(existingComs[count]);
                    var text = com.find('.com-text');
                    var comBar = com.find('.com-bar');
                    com.attr('id', comment.id);
                    com.attr('podcastId', comment.podcast);
                    com.attr('masterId', comment.master);
                    com.attr('replyToId', comment.replyToId);
                    com.attr('subCount', comment.subCount);
                    com.attr('date', comment.datetime);
                    text.html(name_wrap_template.format(getColorOfString(comment.username), comment.username));
                    text.append(comment.comment + '<span class="text-place"></span>');
                    comBar.find('.com-date').text(timeSince(Date.parse(comment.datetime)));
                    comBar.find('.com-like').html('<i class="icon-heart"></i>' + nFormatter(comment.likes, 1));
                    comBar.find('.com-comment').html('<i class="icon-comment"></i>' + nFormatter(comment.subCount, 1));
                    com.find('.com-subs').text('');
                    count += 1;
                    updateComment(podcastId, comment.id);
                });

                // Remove Extra Existing Coms
                for(x=count;x<existingCount;x++){
                    existingComs[x].remove();
                    commentsLoaded -= 1;
                }
                // Make Coms Visible
                $('.com').addClass('populated');
            }
            else if(existingCount < loadCount){
                if(existingCount > 0){
                    var count = 0;
                    // Re-populate Existing Coms & Create New Coms with Data
                    $.each(commentData, function(index, comment){
                        if(count < existingCount){
                            var com = $(existingComs[count]);
                            var text = com.find('.com-text');
                            var comBar = com.find('.com-bar');
                            com.attr('id', comment.id);
                            com.attr('podcastId', comment.podcast);
                            com.attr('masterId', comment.master);
                            com.attr('replyToId', comment.replyToId);
                            com.attr('subCount', comment.subCount);
                            com.attr('date', comment.datetime);
                            text.html(name_wrap_template.format(getColorOfString(comment.username), comment.username));
                            text.append(comment.comment + '<span class="text-place"></span>');
                            comBar.find('.com-date').text(timeSince(Date.parse(comment.datetime)));
                            comBar.find('.com-like').html('<i class="icon-heart"></i>' + nFormatter(comment.likes, 1));
                            comBar.find('.com-comment').html('<i class="icon-comment"></i>' + nFormatter(comment.subCount, 1));
                            com.find('.com-subs').text('');
                            count += 1;
                            updateComment(podcastId, comment.id);
                        }
                        else{
                            content.append(formatComment(comment_template, comment));
                            updateComment(podcastId, comment.id);
                            commentsLoaded += 1;
                        }

                    });
                }
                else{
                    content.text('');
                    // Create and Append Coms
                    $.each(commentData, function (index, comment){
                        content.append(formatComment(comment_template, comment));
                        updateComment(podcastId, comment.id);
                        commentsLoaded += 1;
                    });
                }
                // Make Coms Visible
                $('.com').addClass('populated');
            }
            else{
                var count = 0;
                // Re-populate Existing Coms with Data
                $.each(commentData, function(index, comment){
                    var com = $(existingComs[count]);
                    var text = com.find('.com-text');
                    var comBar = com.find('.com-bar');
                    com.attr('id', comment.id);
                    com.attr('podcastId', comment.podcast);
                    com.attr('masterId', comment.master);
                    com.attr('replyToId', comment.replyToId);
                    com.attr('subCount', comment.subCount);
                    com.attr('date', comment.datetime);
                    text.html(name_wrap_template.format(getColorOfString(comment.username), comment.username));
                    text.append(comment.comment + '<span class="text-place"></span>');
                    comBar.find('.com-date').text(timeSince(Date.parse(comment.datetime)));
                    comBar.find('.com-like').html('<i class="icon-heart"></i>' + nFormatter(comment.likes, 1));
                    comBar.find('.com-comment').html('<i class="icon-comment"></i>' + nFormatter(comment.subCount, 1));
                    com.find('.com-subs').text('');
                    count += 1;
                    updateComment(podcastId, comment.id);
                });
                // Make Coms Visible
                $('.com').addClass('populated');
            }
        }
        else{
            // Create and Append Coms
            $.each(commentData, function (index, comment){
                content.append(formatComment(comment_template, comment));
                updateComment(podcastId, comment.id);
                commentsLoaded += 1;
            });
            $('.com').addClass('populated');
        }

        $('.text-place').hide();
        if(scrollTo != 0){
            scrollToComment($('#' + scrollTo));
        }
    }
}

function drawSubCommentsToViewport(commentId, commentData, loadCount, totalCount, offset){
    var com = $('#' + commentId);
    podcastId = com.attr('podcastId');
    commentSection = com.find('.com-subs');
    if(offset === 0){
        commentSection.text('');
        $.each(commentData, function(index, comment){
            if(comment.replyToId !== 0 && comment.replyToId !== comment.master){
                commentSection.prepend(formatComment(sub_comment_template_deep, comment));

            }else{
                commentSection.prepend(formatComment(sub_comment_template, comment));
            }
            updateComment(podcastId, comment.id);
        });
        com.attr('loaded', loadCount);
    }
    else{
        commentSection.find('.com-sub-extend').remove();
        $.each(commentData, function(index, comment){
            if(comment.replyToId !== 0 && comment.replyToId !== comment.master){
                commentSection.append(formatComment(sub_comment_template_deep, comment));

            }else{
                commentSection.append(formatComment(sub_comment_template, comment));
            }
            updateComment(podcastId, comment.id);
        });
        if(com.attr('loaded') !== undefined){
            var newLoaded = parseInt(com.attr('loaded'));
            newLoaded += loadCount;
            com.attr('loaded', newLoaded);
        }
    }
    $('.com').addClass('populated');
    totalCount = 0;
    if (com.attr('subCount') !== undefined){
        totalCount = parseInt(com.attr('subCount'));
    }

    console.log(totalCount);
    if(loadCount > 0 && totalCount > loadCount){
        commentSection.append('<div class="com-sub-extend">LOAD MORE</i></div>');
        commentSection.find('.com-sub-extend').show();

    }
}


function enableCommentLoadBar(commentId){
    var com = $('#' + commentId + ' .com-comment i');
    com.removeClass('icon-comment');
    com.addClass('icon-sync-alt');
    com.addClass('loading');
    setTimeout(function(){
        com.addClass('icon-comment');
        com.removeClass('icon-sync-alt');
        com.removeClass('loading');
    }, 20 * 1000);
}
function  disableCommentLoadBar(commentId){
    var com = $('#' + commentId + ' .com-comment i');
    com.addClass('icon-comment');
    com.removeClass('icon-sync-alt');
    com.removeClass('loading');
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
            commentSection = podcast.find('.coms')
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
    return commentTemplate.format(comment.id,
        comment.username,
        getColorOfString(comment.username),
        comment.comment,
        comment.podcast,
        comment.master,
        comment.replyToId,
        comment.replyToName,
        getColorOfString(comment.replyToName),
        timeSince(Date.parse(comment.datetime)),
        nFormatter(comment.likes, 1),
        nFormatter(comment.subCount, 1),
        comment.datetime,
        comment.subCount);
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

function scrollToComment(selector) {
    var offset = selector.offset();
    var $main = $('.coms');
    $main.animate({
        scrollTop: offset.top - ($main.offset().top - $main.scrollTop())
    }, "fast");
}

// Comment Input
function setInputPop(podcastId, name, color){
    var popTemplate = '<span class="pop" style="color:' + color + ';" contenteditable="false"><i class="icon-times" style="color:#4d4d4d;"></i>{0}</span>&nbsp;';
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
    console.log('Like Podcast: ' + errorMessage);
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
    console.log('Dislike Podcast: ' + errorMessage);
}
// Locally Change Like Count on Comment
function addToCommentLikes(commentId, amount){
    var comment = $('#' + commentId);
    var points = comment.find('.com-like').text();
    if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
    }else{
        points = parseInt(points);
        points += amount;
        comment.find('.com-like').html('<i class="icon-heart"></i><i class="icon-heart-broken"></i>' + nFormatter(points, 1));
    }
}
// Submit Comment
function submitComment(podcastId, userId, commentText, parentId=0, replyToId=0){
    if(commentText.length > 1){
        //Call Web Action
        waSubmitComment(podcastId, userId, commentText, parentId, replyToId);
        if(window.analytics) {
            gtag('event', 'comment_submit', {
                "id": podcastId
            });
        }
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
        getCommentsMaster(podcastId, max_comments_intial, 0, commentId);
    }
}
function submitCommentFailed(errorMessage){
    console.log(errorMessage);
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
                podcast.find('.coms').addClass('enlarge-edit');
                podcast.find('.comments-wrap').addClass('enlarge-edit-wrap');
            }
        }
        else{
            if(podcast.hasClass('enlarge')){
                podcast.find('.comment').removeClass('enlarge');
                podcast.find('.coms').removeClass('enlarge-edit');
                podcast.find('.comments-wrap').removeClass('enlarge-edit-wrap');
            }
        }
    });
    //Like Comment
    $(document).on('click', '.com-like', function(){
        if(canClickAgain()) {
            waLikeComment($(this).parent().parent().attr('id'));
        }
    });
    //Disike Comment
    $(document).on('click', '.com-dislike', function(){
        if(canClickAgain()) {
            waDislikeComment($(this).parent().parent().attr('id'));
        }
    });
    //Extend Comments
    $(document).on('click', '.com-comment, .com-reply', function(){
        if(canClickAgain()) {
            var comment = $(this).parent().parent();
            var isReplyBtn = ($(this).hasClass('com-reply'));
            if (comment != undefined) {
                var commentId = comment.attr('id');
                var podcastId = comment.attr('podcastId');
                var name = comment.find('.com-name').text();
                if (comment.attr('masterId') !== '0') {
                    return;
                }
                if (comment.attr('extended') !== 'yes') {
                    scrollToComment(comment);
                    if (isReplyBtn) {
                        if (isLoggedIn()) {
                            enableCommentLoadBar(commentId);
                            getCommentsSub(commentId, 5, 0);
                        } else {
                            promptForLogin();
                            enableCommentLoadBar(commentId);
                            getCommentsSub(commentId, 5, 0);
                        }
                    } else {
                        enableCommentLoadBar(commentId);
                        getCommentsSub(commentId, 5, 0);
                    }
                } else if (!isReplyBtn) {
                    comment.attr('extended', 'no');
                    comment.find('.com-subs').text('');
                    comment.find('.com-sub-extend').hide();
                    comment.find('.com-subs').css('padding-bottom', '0');
                    comment.attr('loaded', 0);
                    comment.find('.com-subs').css('border-top', 'none');
                    comment.find('.com-subs').css('background', 'transparent');
                }

                //Extended Comment Analytic
                //commentId podcastId name
            }
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

    //Sub Comment Section Extend Btn
    $(document).on('click', '.com-sub-extend', function(){
        if(canClickAgain()) {
            var com = $(this).parent().parent();
            if (com.attr('loaded') !== undefined) {
                var loaded = parseInt(com.attr('loaded'));
                getCommentsSub(com.attr('id'), 5, loaded)
            }
        }
    });

}


//</editor-fold>

//<editor-fold desc="LOGIN / SIGNUP">

// Prompt User For Login
function promptForLogin(){
    var nickname = $('#authentication');
    var container = $('#authentication-inner');
    var usernameField = container.find('input[type=text]');
    var passwordField = container.find('input[type=password]');
    var cancelBtn = container.find('.cancel');
    var continueBtn = container.find('.continue');
    nickname.show();
    setTimeout(function (){
        usernameField.select(); }, 250);
    usernameField.on('change keyup paste', function (){
        var username = usernameField.val().toLowerCase();
        var password = passwordField.val();
        if(username.length > 4){
            if(password.length > 5){
                continueBtn.css('color', 'lightgrey');
            }
            else{
                continueBtn.css('color', 'grey');
            }
            usernameField.css('color', getColorOfString(username));
        }
        else{
            continueBtn.css('color', 'grey');
            usernameField.css('color', 'lightgrey');
        }
    });
    passwordField.on('change keyup paste', function (){
        var username = usernameField.val().toLowerCase();
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
    usernameField.on('keypress', function (e) {
        if(e.which === 13 && !e.shiftKey){
            var usernameV = usernameField.val().toLowerCase();
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
                                        $('#authentication').hide();
                                        $('#authentication .error').hide();
                                        window.username = usernameV;
                                        window.CSRF_TOKEN = datatwo.newToken;
                                        $('.username-preview').text('[ ' + usernameV + ' ]');
                                        window.authenticated = true;
                                        $('#wrap').addClass('authenticated');
                                        $('nav').addClass('authenticated');
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
                            $('#authentication .error').show();
                            $('#authentication .error').text(data.reason);
                            $('#authentication input[type=text]').focus();
                        }
                    },
                    error: function (error){
                        console.log(error);
                    }
                });
            }
        }
    });
    continueBtn.on('click', function (){
        var usernameV = usernameField.val().toLowerCase();
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
                                    $('#authentication').hide();
                                    $('#authentication .error').hide();
                                    window.username = usernameV;
                                    window.CSRF_TOKEN = datatwo.newToken;
                                    $('.username-preview').text('[ ' + usernameV + ' ]');
                                    window.authenticated = true;
                                    $('#wrap').addClass('authenticated');
                                    $('nav').addClass('authenticated');
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
                        $('#authentication .error').show();
                        $('#authentication .error').text(data.reason);
                        $('#authentication input[type=text]').focus();
                    }
                },
                error: function (error){
                    console.log(error);
                }
            });
        }

    });
    cancelBtn.on('click', function (){
        $('#authentication').hide();
    });
}

// Check If Logged In
function isLoggedIn(){
    return window.authenticated;
}
//</editor-fold>

//<editor-fold desc="USER DATA">

function getUserData(podcastId){

    return userdatas[podcastId]
}
function storeNewUserData(podcastId, userData){

    userdatas[podcastId] = userData;
}
//</editor-fold>

//<editor-fold desc="WEB ACTIONS">

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
            else{
                getCommentsMaster(podcastId, max_comments_intial, 0);
            }
        },
        error: function (error){console.log(error);}
    });
}

// Request All Podcast Data Snippet
function waRequestAllPodcastData(){
    var pageUrl = '/data/get-all/podcasts/';
    toggleLoadRing(true);
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

    if(isLoggedIn()){
        $.ajax({type: 'GET',url: pageUrl,dataType: 'json',
            success: function (data) {
                if(data.status === 'success'){
                    addLikeSuccess(commentId);
                }
                else{
                    addLikeFailed(data.reason);
                }
            },
            error: function (error){console.log(error);}
        });
    }
    else{
        promptForLogin();
    }

    if(window.analytics) {
        gtag('event', 'comment_like', {
            "id": commentId
        });
    }
}

// Dislike Comment
function waDislikeComment(commentId){
    var pageUrl = '/action/dislike/' + commentId + '/';

    if(isLoggedIn()){
        $.ajax({type: 'GET',url: pageUrl,dataType: 'json',
            success: function (data) {
                if(data.status === 'success'){
                    removeLikeSuccess(commentId);
                }
                else{
                    removeLikeFailed(data.reason);
                }
            },
            error: function (error){console.log(error);}
        });
    }
    else{
        promptForLogin();
    }

    if(window.analytics) {
        gtag('event', 'comment_dislike', {
            "id": commentId
        });
    }
}
//</editor-fold>

//<editor-fold desc="AUTO UPDATER : interval">

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
//</editor-fold>

//<editor-fold desc="HELPFUL FUNCTIONS">

// Get Podcast Id from Podcast Element
function getPodcastId(podcastElement){
    if(podcastElement != undefined){
        return parseInt(podcastElement.attr('podcastId'));
    }
    return 0;
}

// Get Podcast from Id
function getPodcast(podcastId){
    return $('#podcast-' + podcastId);
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

function canClickAgain(){
    if(canClick){
        canClick = false;
        setTimeout(function (){
            canClick = true;
        },500)
        return true;
    }
    return false;
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


// Get Name Color
function getColorOfString(inputString){
    var minLuma = 60;
    var tries = 0;
    while (true){
        for(i=0;i<tries;i++){
            inputString += inputString[0]
        }
        var hash = 0;
        for (var i = 0; i < inputString.length; i++) {
            hash = inputString.charCodeAt(i) + ((hash << 5) - hash);
        }
        var color = '';
        for (var e = 0; e < 3; e++) {
            var value = (hash >> (e * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        var rgb = parseInt(color.substring(1), 16);
        var r = (rgb >> 16) & 0xff;
        var g = (rgb >>  8) & 0xff;
        var b = (rgb >>  0) & 0xff;
        var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        tries += 1;
        if (luma >= minLuma) {
            return '#' + color;
        }
        else if(tries > 5){
            return '#ffffff'
        }
    }


}


//</editor-fold>

//<editor-fold desc="ALL EVENTS">

// Register Page Events
function registerPageEvents(){
    $(document).on('click', '.logout-button', function (){
        console.log('logout');
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
                    console.log('logout failed');
                }
            },
            error: function (error){
                console.log(error);
            }
        });
    });
    $(document).on('change keyup paste', '.search-bar', function(){
        search = $(this).val().toString();
        if(search !== lastSearch){
            $('.search-submit').text('SEARCH');
        }
    });
    $(document).on('keypress','.search-bar', function (e) {
        if(e.which === 13 && !e.shiftKey){
            if($('.search-submit').text() == 'CLEAR'){
                search = '';
                currentSearch = '';
                $('.search-submit').text('SEARCH');
                updatePodcastView();
            }
            else{
                search = $('.search-bar').val();
                if(search.length > 0){
                    updatePodcastView();
                    lastSearch = search;
                    if(window.analytics) {
                        gtag('event', 'search_podcasts', {
                            "search": search
                        });
                    }
                }
            }
        }
    });
    $(document).on('click', '.search-submit', function(){
        if($('.search-submit').text() == 'CLEAR'){
            search = '';
            currentSearch = '';
            $('.search-submit').text('SEARCH');
            updatePodcastView();
        }
        else{
            search = $('.search-bar').val();
            if(search.length > 0){
                updatePodcastView();
                lastSearch = search;
                if(window.analytics) {
                    gtag('event', 'search_podcasts', {
                        "search": search
                    });
                }
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
    $(document).on('click', '.admin-button', function(){
        if ($('.admin-drop').hidden === true){
            $('.admin-drop').show();
        }
        else{
            $('.admin-drop').hide();
        }
        console.log('clicked');
    });
    $(document).on('click', '.admin-task', function(){
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
    enableScrollFading();
}

// Register Podcast Events
function registerPodcastEvents(){
    $(document).on('click', '.pod', function(){
        var pod = $(this);
        if (canClickAgain() && !pod.hasClass('extended') && pod.hasClass('populated')){
            $('#pods').css('scroll-snap-type', 'none');
            turnOn(pod);
            setTimeout(function (){
                $('#pods').css('scroll-snap-type', 'none');
            }, 1000);
        }
    });
    $(document).on('click', '.close', function(){
        var parent = $(this).parent().parent();
        if(canClickAgain() && parent.hasClass('extended')){
            turnOff(parent);
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


function enableScrollFading(){
    var marginTop = parseFloat($('.pod').css('margin-top'));
    var podHeight = $('.pod').height() + marginTop;
    var pods = $('#pods-wrap');
    pods.scroll(function(){
        var calc = pods.scrollTop() / podHeight;
        var topIndex = parseInt(calc);
        var bottomOpacity = calc - topIndex;
        var topOpacity = 1 - bottomOpacity;
        for(i=topIndex - 1;i<topIndex+13;i++){
            var opacity = 1;
            if(i === topIndex){
                opacity = topOpacity.toFixed(1);
            }
            else if(i === topIndex + 11){
                opacity = bottomOpacity.toFixed(1);
            }
            else if(i === topIndex - 1){
                opacity = 0;
            }
            else if(i === topIndex + 12){
                opacity = 0;
            }
            if(i >= 0){
                $(loaded_podcasts[i]).css('opacity', opacity);
            }
        }
        podcastLoadUnload(topIndex + 10);
    });
}

function hideAllPodcastsExceptVisible(){
    var marginTop = parseFloat($('.pod').css('margin-top'));
    var podHeight = $('.pod').height() + marginTop;
    var pods = $('#pods-wrap');
    var calc = pods.scrollTop() / podHeight;
    var topIndex = parseInt(calc);
    var loadedLength = loaded_podcasts.length;
    var opacity = 0;
    for(i=0;i<loadedLength;i++){
        if(i >= topIndex && i < topIndex + 11){
            opacity = 1;
        }
        else{
            opacity = 0;
        }
        $(loaded_podcasts[i]).css('opacity', opacity);
    }
}
//</editor-fold>