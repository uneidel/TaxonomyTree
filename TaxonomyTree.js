/*
	Copyright (c) 2015 uneidel


Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:


The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.


THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.





*/
function GetTaxonomyTerms(termsetId)
{
    var d = $.Deferred(); 
    SP.SOD.loadMultiple(['sp.js'], function ()
    {
        SP.SOD.registerSod('sp.taxonomy.js', SP.Utilities.Utility.getLayoutsPageUrl('sp.taxonomy.js'));
        SP.SOD.loadMultiple(['sp.taxonomy.js'], function () {
            var ctx = SP.ClientContext.get_current();
            taxonomySession = SP.Taxonomy.TaxonomySession.getTaxonomySession(ctx),
            termStore = taxonomySession.getDefaultSiteCollectionTermStore(),
            termSet = termStore.getTermSet(termsetId),
            terms = termSet.getAllTerms();
            ctx.load(terms);
            ctx.executeQueryAsync(function(){ d.resolve(terms)}, function(err){d.reject("Strange things can happen.")});
        });
    });
    return d.promise();
} 
function GetGuidForCurrentPage()
	{
        var d = $.Deferred(); 
	   var baseUrl = window.location.protocol + "//" + window.location.host + "/" + _spPageContextInfo.siteServerRelativeUrl;
	   var steckbriefUrl = _spPageContextInfo.siteServerRelativeUrl + "/" + _spPageContextInfo.serverRequestPath; 
		$.ajax({
		url: baseUrl + "/_api/web/getFileByServerRelativeUrl('" + _spPageContextInfo.siteServerRelativeUrl + "/pages/steckbrief.aspx')/ListItemAllFields",
		method: "GET",
		headers: { "Accept": "application/json; odata=verbose" },
		success: function (data) { d.resolve(data.d.bOrg)},
		error: function (data) { d.reject("Strange things can happen. -  Error:" + data.Status); }
		});
        return d.promise();
	}
function CreateTermsTree(terms)
{
        var tenum = terms.getEnumerator();
        var tree = {
                    term: terms,
                    children: []
                };
        while(tenum.moveNext())
        {
            var curTerm = tenum.get_current();
            var curTermPath = curTerm.get_pathOfTerm().split(';');
            var children = tree.children;
            for (var i =0; i < curTermPath.length;i++)
            {
                var foundNode = false;
 
                    for (var j = 0; j < children.length; j++)
                    {
                        if (children[j].name === curTermPath[i]) {
                            foundNode = true;
                            break;
                        }
                    }
 
                    
                    var term = foundNode ? children[j] : { name: curTermPath[i], children: [] };
 
                  
                    if (i === curTermPath.length - 1) {
                        term.term = curTerm;
                        term.title = curTerm.get_name();
                        term.guid = curTerm.get_id().toString();
						term.url = curTerm.get_objectData().get_properties()["LocalCustomProperties"]["LocationUrl"];
						
                    }
 
                    // If the node did exist, let's look there next iteration
                    if (foundNode) {
                        children = term.children;
                    }
                    // If the segment of path does not exist, create it
                    else {
                        children.push(term);
 
                        // Reset the children pointer to add there next iteration
                        if (i !== curTermPath.length - 1) {
                            children = term.children;
                        }
                    }
            }
        }
        tree = SortTermsFromTree(tree);
        return tree;
}
function SortTermsFromTree(tree)
{
    // Check to see if the get_customSortOrder function is defined. If the term is actually a term collection,
        // there is nothing to sort.
        if (tree.children.length && tree.term.get_customSortOrder) {
            var sortOrder = null;
 
            if (tree.term.get_customSortOrder()) {
                sortOrder = tree.term.get_customSortOrder();
            }
 
            // If not null, the custom sort order is a string of GUIDs, delimited by a :
            if (sortOrder) {
                sortOrder = sortOrder.split(':');
 
                tree.children.sort(function (a, b) {
                    var indexA = sortOrder.indexOf(a.guid);
                    var indexB = sortOrder.indexOf(b.guid);
 
                    if (indexA > indexB) {
                        return 1;
                    } else if (indexA < indexB) {
                        return -1;
                    }
 
                    return 0;
                });
            }
            // If null, terms are just sorted alphabetically
            else {
                tree.children.sort(function (a, b) {
                    if (a.title > b.title) {
                        return 1;
                    } else if (a.title < b.title) {
                        return -1;
                    }
 
                    return 0;
                });
            }
        }
 
        for (var i = 0; i < tree.children.length; i++) {
            tree.children[i] = SortTermsFromTree(tree.children[i]);
        }
 
        return tree;
}

function RenderTree(term)
{   
	var hasChildren = term.children && term.children.length;
	var helperclass="";
	var html="";
	var html = "<li><a alt='" + term.guid + "' href='" +term.url +  "' >" + term.title + "</a>";
	if(hasChildren)
	{
		//TODO MAKE IT NICE
		helperclass="parent";
		html = "<li class='" + helperclass + "'><span class='open' style='cursor:pointer;padding-right:5px'>+</span><a alt='" + term.guid + "' href='" +term.url +  "' >" + term.title + "</a>";
	}
    if (term.children && term.children.length) {
        html += '<ul>';
 
        for (var i = 0; i < term.children.length; i++) {
            html += RenderTree(term.children[i]);
        }
 
        html += '</ul>';
    }
 
    return html + '</li>';
}

$(function () {
        $.when(GetTaxonomyTerms('5dcba49c-ce1e-4503-bf0e-779a0df59c2b'), GetGuidForCurrentPage()).done(function(terms, termguid)
        {
            debugger;
            var tree =  CreateTermsTree(terms);
            var html ='';
            for (var i = 0; i < tree.children.length; i++) {
                html += RenderTree(tree.children[i]);
            }
           $("#OrgChart").html(html);
           $( '.tree li.parent > span' ).click( function( ) {
						$( this ).parent().toggleClass( 'active' );
						$( this ).parent().children( 'ul' ).slideToggle( 'fast' );
		    });
            
			$(".tree").find("a[alt='"+ termguid.TermGuid + "']").css("font-weight", "bold").parents("ul").slideToggle("fast");
		
        });	
    
});

