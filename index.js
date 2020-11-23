#!/usr/bin/env node
'use strict';

const clipboardy = require( 'clipboardy' );
const program = require( 'commander' );
const urlencode = require( 'urlencode' );
const urldecode = require( 'urldecode' );
const request = require( 'request' );
const requestPromise = require( 'request-promise' );
const _ = require( 'lodash' );
const { Octokit } = require("@octokit/rest");
const { forEach } = require('lodash');
const octokit = new Octokit( {
	auth: `${ process.env.GH_API_TOKEN }`
} );

const headers = {
	'Content-Type': 'application/json;charset=UTF-8',
	Authorization: `token ${ process.env.GH_API_TOKEN }`,
	Accept: 'application/vnd.github.inertia-preview+json',
	'User-Agent': 'request',
};

const encodeString = ( string ) => {
	const input = string && string.length ? string : clipboardy.readSync();
	console.log( `enoding: ${ input }` );
	const enocded = urlencode( input );
	clipboardy.writeSync( enocded );
	console.log( `${ enocded } copied to clipboard 💫` );
};

const decodeString = ( string ) => {
	const input = string && string.length ? string : clipboardy.readSync();
	console.log( `decoding: ${ input }` );
	const enocded = urldecode( input );
	clipboardy.writeSync( enocded );
	console.log( `${ enocded } copied to clipboard 💫` );
};

const authorWPCOMMap = {
	'Timmy Crawford': 'timmydcrawford',
	'Jeff Stieler': 'jeffstieler',
	'Joshua T Flowers': 'joshuaflow',
	Fernando: 'fermarichal',
	'Bec Scott': 'becdetat',
	'Paul Sealock': 'psealk',
	'Matt Sherman': 'mattormeeple',
	'Sam Seay': 'samuelseay',
};
const getWPCOMFromAuthor = function ( name ) {
	return authorWPCOMMap[ name ] ? `@${ authorWPCOMMap[ name ] }` : name;
};

const buildChangelog = ( org, repo, since ) => {
	octokit
		.paginate("GET /repos/:owner/:repo/commits?since=:since", {
			owner: org,
			repo: repo,
			since: since  
		} )
		.then( async ( commits ) => {
			console.log( 'total commits', commits.length );
			const prRegex = /\(#\d*\)/g;
			let rows = [];
			_.map( commits, ( column ) => {
				const message = column.commit.message;
				const found = message.match( prRegex );
				let prData;
				if ( found && found.length ) {
					// we have a PR number.
					const pr = found[ 0 ];
					const prNumber = pr.substring( 2, pr.length - 1 );
					const parts = message.split( pr );
					const author = getWPCOMFromAuthor(
						column.commit.author.name
					);
					prData = {
						prNumber: prNumber,
						date: column.commit.author.date,
						message: parts[0],
						author: author
					};
				} else {
					prData = {
						prNumber: null,
						date: column.commit.author.date,
						message: column.commit.message,
						author: column.commit.author.name
					}
				}
				if ( prData.author != 'renovate[bot]' && prData.prNumber ) {
					rows.push( prData );
				}
			} );
			return rows;
		} )
		.then( ( final ) => {
			forEach( final, (commit ) => {
				console.log( `${ commit.message } [#${ commit.prNumber }](https://github.com/${org}/${ repo }/pull/${ commit.prNumber })` );
			} );
		} );
}

const repoCommits = ( repo, since, until ) => {
	console.log( 'since', since );
	console.log( 'until', until );
	const options = {
		url: `https://api.github.com/repos/${ repo }/commits?since=${ since }&until=${ until }`,
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			Authorization: `token ${ process.env.GH_API_TOKEN }`,
			Accept: 'application/vnd.github.inertia-preview+json',
			'User-Agent': 'request',
		},
	};
	request( options, ( error, response, body ) => {
		if ( ! error && response.statusCode == 200 ) {
			const data = JSON.parse( body );
			const prRegex = /\(#\d*\)/g;
			const columns = _.map( data, ( column ) => {
				const message = column.commit.message;
				const found = message.match( prRegex );
				if ( found && found.length ) {
					// we have a PR number.
					const pr = found[ 0 ];
					const prNumber = pr.substring( 2, pr.length - 1 );
					const parts = message.split( pr );
					const author = getWPCOMFromAuthor(
						column.commit.author.name
					);
					return `[#${ prNumber }](https://github.com/${ repo }/pull/${ prNumber }) ${ parts[ 0 ] }- ${ author } ${ column.commit.author.date }`;
				} else {
					return (
						column.commit.message +
						' : ' +
						column.commit.author.name
					);
				}
			} );
			console.log( '\n' + columns.join( '\n' ) );
		} else {
			console.log( '🤯' );
			console.log( response.statusMessage );
		}
	} );
};

const projectColumns = ( projectId ) => {
	const options = {
		url: 'https://api.github.com/projects/1492664/columns',
		headers,
	};

	request( options, ( error, response, body ) => {
		if ( ! error && response.statusCode == 200 ) {
			const data = JSON.parse( body );
			const columns = _.map( data, ( column ) => {
				return [ column.id, column.name ];
			} );
			console.log( columns );
		} else {
			console.log( '🤯' );
			console.log( response.statusMessage );
		}
	} );
};

const getPullRequestType = ( labels ) => {
	const typeLabel = labels.find( ( label ) =>
		label.name.includes( '[Type]' )
	);
	if ( ! typeLabel ) {
		return 'Dev';
	}
	return typeLabel.name.replace( '[Type] ', '' );
};

const getLabels = ( labels ) => {
	return labels
		.filter( ( label ) => ! /\[.*\]/.test( label.name ) )
		.map( ( label ) => label.name )
		.join( ', ' );
};
const isCollaborator = async ( username ) => {
	return requestPromise( {
		url: `https://api.github.com/orgs/woocommerce/members/${ username }`,
		headers,
		resolveWithFullResponse: true,
	} )
		.then( ( response ) => {
			return response.statusCode === 204;
		} )
		.catch( ( err ) => {
			if ( err.statusCode !== 404 ) {
				console.log( '🤯' );
				console.log( err.message );
			}
		} );
};

const writeEntry = async ( content_url ) => {
	const options = {
		url: content_url,
		headers,
		json: true,
	};
	return requestPromise( options )
		.then( async ( data ) => {
			if ( data.pull_request ) {
				const collaborator = await isCollaborator( data.user.login );
				const type = getPullRequestType( data.labels );
				const labels = getLabels( data.labels );
				const labelTag = labels.length ? `(${ labels })` : '';
				const authorTag = !! collaborator
					? ''
					: `👏 @${ data.user.login }`;
				const entry = `- ${ type }: ${ data.title } #${ data.number } ${ labelTag } ${ authorTag }`;
				console.log( entry );
			}
		} )
		.catch( ( err ) => {
			console.log( '🤯' );
			console.log( err.message );
		} );
};

const columnCards = async ( columnId ) => {
	const options = {
		url: `https://api.github.com/projects/columns/${ columnId }/cards`,
		headers,
		json: true,
	};

	return requestPromise( options ).catch( ( err ) => {
		console.log( '🤯' );
		console.log( err.message );
	} );
};

const makeChangelog = async ( columnId ) => {
	const cards = await columnCards( columnId );
	cards.forEach( async ( card ) => {
		await writeEntry( card.content_url );
	} );
};

program
	.version( '0.0.1' )
	.command( 'enc [string]' )
	.description( 'url encode a string' )
	.action( encodeString );

program
	.command( 'dec [string]' )
	.description( 'url decode a string' )
	.action( decodeString );

program
	.command( 'columns' )
	.description( 'get columns' )
	.action( projectColumns );

program
	.command( 'changelog' )
	.description( 'create changelog' )
	.action( makeChangelog );

program
	.command( 'commits <string> [string] [string]' )
	.description( 'get commits from repo since date' )
	.action( repoCommits );

program
	.command( 'changelog <string> <string> <string>' )
	.description( 'get commits from repo since date' )
	.action( buildChangelog );

program.parse( process.argv );

//if ( program.args.length === 0 ) program.help();
