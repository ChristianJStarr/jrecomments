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


var currentReplyId = 0;



var sub_comment_template = '<div class="com-sub" id="{0}" podcastId="{7}" masterId="{8}" replyToId="{9}">' +
    '<a class="com-text">' +
    '<i class="com-name-wrap"><i class="fa fa-heart com-donor {1}"></i>' +
    '<span class="com-name" style="color:rgb{2};">{3}</span>' +
    '<i class="fa fa-karat-right"></i>' +
    '<span class="com-name" style="color:rgb{11};">{10}</span></i>' +
    '{4}</a>' +
    '<div class="com-bar">' +
    '<a class="com-dislike"><i class="fa fa-arrow-down"></i></a>' +
    '<a class="com-points">{5}</a>' +
    '<a class="com-like"><i class="fa fa-arrow-up"></i></a>' +
    '<a class="com-comment"><i class="far fa-comment"></i>{6}</a>' +
    '<a class="com-reply"><i class="fas fa-reply"></i>Reply</a>' +
    '</div></div>';

var comment_template = '<div class="com" id="{0}" podcastId="{7}">' +
    '<a class="com-text">' +
    '<i class="com-name-wrap"><i class="fa fa-heart com-donor {1}"></i>' +
    '<span class="com-name" style="color:rgb{2};">{3}</span></i>' +
    '{4}</a>' +
    '<div class="com-bar">' +
    '<a class="com-dislike"><i class="fa fa-arrow-down"></i></a>' +
    '<a class="com-points">{5}</a>' +
    '<a class="com-like"><i class="fa fa-arrow-up"></i></a>' +
    '<a class="com-comment"><i class="far fa-comment"></i>{6}</a>' +
    '<a class="com-reply"><i class="fas fa-reply"></i>Reply</a>' +
    '</div><div class="com-subs"></div></div>';


var dataBar = '<div class="data-bar"><a><i class="far fa-calendar-alt"></i><span>{0}</span></a>' +
    '<a><i class="far fa-clock"></i><span>{1}</span></a>' +
    '<a><i class="fa fa-arrow-up"></i><span class="comment-total">{2}</span></a>' +
    '<a><i class="far fa-comment"></i><span class="comment-total">{3}</span></a></div>';

var commentsWrapTemplate = '<div class="comments-wrap"><div class="comments no-scroll-bar-com"></div></div>';

var commentInputTemplate = '<div class="comment"><a class="comment-max-char"></a>' +
    '<div class="comment-input" contenteditable="true" name="comment" maxlength="250" placeholder="Write a comment!" required></div>' +
    '<input class="comment-submit" type="submit" value="">' +
    '<i class="fa fa-arrow-right submit"></i></div>';











$(document).ready(function(){
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

// PODCAST DATA LOADING
function getPodcastData(){
    console.log('getting podcast data');
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
            '<i class="fa fa-close close"></i>' +
            '<div class="content"></div></div>';
        container.append(podcastTemplate.format(podcast[0], podcast[1], podcast[2]));
        objectsLoaded += 1;
    });
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
    var date = new Date(podcastData[3]);
    date = date.getMonth() + '/' + date.getDay() + '/' + date.getFullYear().toString().substr(2);

    content.append(dataBar.format(date, podcastData[2], podcastData[5], podcastData[4]));

    // Create Comment Wrap
    content.append(commentsWrapTemplate);

    // Create Comment Input
    content.append(commentInputTemplate);

    podcast.addClass('extended');
    podcast.find('.duration-preview').css('opacity', 0);
    podcast.find('.data-bar').css('opacity', 1);
    podcast.find('.close').css('opacity', 1);
    podcast.find('.comment-max-char').text('0');
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


    gtag('event','open_podcast', {
        "id": podcastId,
        "name": podcastData[1]
    });
}
function turnOff(podcast){
    var podcastId = podcast.attr('id').split('-')[1];
    var podcastData = podcasts[podcastId];
    podcast.removeClass('extended');
    podcast.find('.duration-preview').css('opacity', 1);
    podcast.find('.close').css('opacity', 0);
    podcast.find('.data-bar').css('opacity', 0);
    podcast.find('.podcast-click').show();
    setTimeout(function (){
        podcast.find('.content').text('');
    }, 500);

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
    console.log('Scrolling To: ' + offset.top + ' Removal: ' + removal);
    $main.animate({
        scrollTop: offset.top - ($main.offset().top - $main.scrollTop()) - removal
    }, "fast");
}


// NICKNAME
var can_submit_nick = false;
function askForNickname(){
    $('#nickname').show();
    $('#nickname-container input[type=text]').focus();
    $('#nickname-container input[type=text]').on('change keyup paste', function (){
        var nick = $('#nickname input[type=text]').val();
        if(nick.length > 2){
            can_submit_nick = true;
            $('#nickname-container input[type=submit]').css('color', 'lightgrey');
        }
        else{
            can_submit_nick = false;
            $('#nickname-container input[type=submit]').css('color', 'grey');
        }
    });
    $('#nickname-container input[type=submit]').on('click', function (){
        var nick = $('#nickname-container input[type=text]').val();
        if(can_submit_nick){
            var pageUrl = '/action/nickname/set/' + nick + '/';
            $.ajax({
                type: 'GET',
                url: pageUrl,
                dataType: 'json',
                success: function (data) {
                    if(data.responseStatus == 'success'){
                        $('#nickname').hide();
                        $('#nickname p').hide();
                        window.nickname = nickname;
                    }
                    else{
                        $('#nickname p').show();
                        $('#nickname p').text(data.responseError);
                        $('#nickname-container input[type=text]').focus();
                    }
                },
                error: function (error){
                    console.log(error);
                }
            });
        }
    });
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
            updateCommentDisplay(podcastId,data.comments, data.comments_total, false);
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
            updateCommentDisplay(commentId,data.comments, data.comments_total, true);
        },
        error: function (error){
            console.log(error);
        }
    });
}

function updateCommentDisplay(id, comments, total_comments, subComment=false){
    var podcastId,podcast;
    var masterId,master,replyToId;
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

    $.each(comments, function(index, comment){
        if(subComment){
            commentSection.append(sub_comment_template.format(comment.id,
                comment.donor,
                comment.nameColor,
                comment.name,
                comment.comment,
                nFormatter(comment.likes - comment.dislikes, 1),
                0, comment.podcast, comment.master, replyToId, replyToName, replyToColor));
            updateComment(comment.id);
        }
        else{
            commentSection.append( comment_template.format(comment.id,
                comment.donor,
                comment.nameColor,
                comment.name,
                comment.comment,
                nFormatter(comment.likes - comment.dislikes, 1),
                0, podcastId));
            updateComment(comment.id);
        }
    });
    databar.find('a span.comment-total').text(nFormatter(total_comments, 1));
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
    if(commenText.length > 1){
        var subComment = false;
        if(parentId != 0){subComment = true;}
        var pageUrl = '/action/comment/' + podcastId + '/' + parentId + '/' + replyToId;
        $.ajax({
            type: 'POST',
            url: pageUrl,
            data: { comment: comment_text, user_id: user_id, csrfmiddlewaretoken: window.CSRF_TOKEN },
            dataType: 'json',
            success: function (data) {
                var status = data.status;
                var reason = data.reason;
                if(status == 'success'){
                    podcast.find('.comment-input').val('');
                }
                else{
                    console.log('Submmit Comment Failed: ' + reason);
                }
                getMasterComments(podcastId, 50, 0);
            },
            error: function (error){
                console.log(error);
            }
        });

        gtag('event','comment_submit', {
            "id": podcastId,
            "name": podcast.attr('id').split('-')[0],
        });
    }
}


// ADDITIONAL
function nFormatter(num, digits) {
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
        if(window.nickname == 'None'){
            askForNickname();
        }
    });

    //Submit Comment
    $(document).on('click', '.comment-submit', function(){
        if(window.nickname == 'None'){
            askForNickname();
            return
        }
        var podcast = $(this).parent().parent().parent();
        if(podcast == null){return}
        var podcastId = podcast.attr('id').split('-')[1];
        var comment_input = podcast.find('.comment-input');
        var comment_text = comment_input.val();
        var user_id = 0;
        if(comment_text.length > 2){
            var pageUrl = '/action/comment/' + podcastId + '/';
            $.ajax({
                type: 'POST',
                url: pageUrl,
                data: { comment: comment_text, user_id: user_id, csrfmiddlewaretoken: window.CSRF_TOKEN },
                dataType: 'json',
                success: function (data) {
                    var commentId = data.commentId;
                    var code = data.response;

                    //Code 500 - No Comment Received
                    //Code 502 - No Nickname Set
                    //Code 503 - Podcast not Found
                    if(code == 500){}
                    else if(code == 502){
                        askForNickname();
                    }
                    else if(code == 503){}

                    podcast.find('.comment-input').val('');
                    getMasterComments(podcastId, 50, 0);
                    comment_input.focus();
                },
                error: function (error){
                    console.log(error);
                }
            });

            gtag('event','comment_submit', {
                "id": podcastId,
                "name": podcast.attr('id').split('-')[0],
            });
        }
    });
    $(document).on('keypress','.comment-input', function (e) {
        if(e.which === 13 && !e.shiftKey){
            if(window.nickname == 'None'){
                askForNickname();
                return
            }
            //Disable textbox to prevent multiple submit
            $(this).attr("disabled", "disabled");
            var podcast = $(this).parent().parent();
            var podcastId = podcast.attr('id').split('-')[1];
            var comment_input = podcast.find('.comment-input');
            var comment_text = comment_input.val();
            var user_id = 0;

            //Enable the textbox again if needed.
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
                    var points = comment.find('.com-points').text();
                    if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
                    }else{
                        points = parseInt(points);
                        points += 1;
                        if(wasDisliked){
                            points += 1;
                        }
                        comment.find('.com-points').text(nFormatter(points, 1));
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
            var points = comment.find('.com-points').text();
            if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
            }else{
                points = parseInt(points);
                points -= 1;
                comment.find('.com-points').text(nFormatter(points, 1));
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

    //Set Reply
    $(document).on('click', '.com-comment, .com-reply', function(){
       var comment = $(this).parent().parent();
       if(comment != null){
           var commentId = comment.attr('commentId');
           var podcastId = comment.attr('podcastId');
           var name = comment.find('.com-name').text();
           currentReplyId = commentId;
           setInputPop(podcastId, name)
       }
    });

}


function setInputPop(podcastId, name){
    var popTemplate = '<span class="pop" contenteditable="false"><i class="fa fa-close"></i>{0}</span>&nbsp;';
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