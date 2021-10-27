var max_allowed_opened = 1;
var max_podcasts_initial = 100;
var max_podcasts_loadin = 50;
var opened = [];
var podcasts = {};
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
                        podcast.find('.comment-input').val('');
                        getMasterComments(podcastId, 50, 0);
                        comment_input.focus();
                    },
                    error: function (error){
                        console.log(error);
                    }
                });
            }
            //Enable the textbox again if needed.
            $(this).removeAttr("disabled");
        }
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

    // SET CONTENT
    content.text('');

    // Create Data Bar
    var date = new Date(podcastData[3]);
    date = date.getMonth() + '/' + date.getDay() + '/' + date.getFullYear().toString().substr(2);
    var dataBar = '<div class="data-bar"><a><i class="far fa-calendar-alt"></i><span>{0}</span></a>' +
        '<a><i class="far fa-clock"></i><span>{1}</span></a>' +
        '<a><i class="far fa-comment"></i><span class="comment-total">{2}</span></a></div>';
    content.append(dataBar.format(date, podcastData[2], podcastData[4]));

    // Create Comment Wrap
    var commentsWrapTemplate = '<div class="comments-wrap"><div class="comments"></div></div>';
    content.append(commentsWrapTemplate);

    // Create Comment Input
    var commentInputTemplate = '<div class="comment"><a class="comment-max-char"></a>' +
        '<textarea class="comment-input" name="comment" maxlength="250" placeholder="Write a comment!" required></textarea>' +
        '<input class="comment-submit" type="submit" value="">' +
        '<i class="fa fa-arrow-right submit"></i></div>';
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
    getMasterComments(podcastId, 50, 0);
    opened.push(podcast);
}
function turnOff(podcast){
    podcast.removeClass('extended');
    podcast.find('.duration-preview').css('opacity', 1);
    podcast.find('.close').css('opacity', 0);
    podcast.find('.data-bar').css('opacity', 0);
    podcast.find('.podcast-click').show();
    setTimeout(function (){
        podcast.find('.content').text('');
    }, 500);
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
function getMasterComments(podcastId, amount, offset){
    var pageUrl = '/data/' + podcastId + '/comments/' + amount + '/' + offset + '/';
    var comments = []
    $.ajax({
        type: 'GET',
        url: pageUrl,
        dataType: 'json',
        success: function (data) {

            updateCommentDisplay(podcastId,data.comments, data.comments_total);
        },
        error: function (error){
            console.log(error);
        }
    });
}
function updateCommentDisplay(podcastId, comments, total_comments){
    var podcast = $('#podcast-' + podcastId);
    var databar = podcast.find('.data-bar');
    var commentSection = podcast.find('.comments');

    commentSection.text('');
    $.each(comments, function(index, comment){
        var comment_template = '<div class="com" id="{0}">' +
            '<a class="com-text">' +
            '<i class="com-name-wrap"><i class="fa fa-heart com-donor {1}"></i>' +
            '<span class="com-name" style="color:rgb{2};">{3}</span></i>' +
            '{4}</a>' +
            '<div class="com-bar">' +
            '<a class="com-dislike"><i class="fa fa-arrow-down"></i></a>' +
            '<a class="com-points">{5}</a>' +
            '<a class="com-like"><i class="fa fa-arrow-up"></i></a>' +
            '<a class="com-comment"><i class="far fa-comment"></i>{6}</a>' +
            '</div></div>';
        comment_template = comment_template.format(comment.id, comment.donor, comment.nameColor, comment.name, comment.comment, nFormatter(comment.likes - comment.dislikes, 1), 0)
        commentSection.append(comment_template);
        updateComment(comment.id);
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

//
