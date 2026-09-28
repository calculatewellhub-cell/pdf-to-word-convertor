<?php
/**
 * Plugin Name: CWH PDF Tools
 * Description: Free, private PDF converter (PDF to Word, Excel, JPG, PNG, Text; Word, Excel, Image, Text to PDF; Merge &amp; Split PDF). Every conversion runs in the visitor's browser, so files are never uploaded. Use the shortcode [cwh_pdf tool="pdf-to-word"] or [cwh_pdf tool="auto"].
 * Version: 1.0.0
 * Author: CalculateWellHub
 * License: GPL-2.0-or-later
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CWH_PDF_VERSION', '1.0.0' );
define( 'CWH_PDF_URL', plugin_dir_url( __FILE__ ) );
define( 'CWH_PDF_DIR', plugin_dir_path( __FILE__ ) );

/**
 * URL path (under home_url) where the hub page lives. Tool pages are its children:
 * /pdf-tools/  and  /pdf-tools/pdf-to-word/ ...
 */
function cwh_pdf_base() {
	return trim( apply_filters( 'cwh_pdf_base_path', 'pdf-tools' ), '/' );
}

function cwh_pdf_url( $slug = '' ) {
	return home_url( '/' . cwh_pdf_base() . '/' . ( $slug ? $slug . '/' : '' ) );
}

function cwh_pdf_data() {
	static $data = null;
	if ( null === $data ) {
		$json = file_get_contents( CWH_PDF_DIR . 'tools.json' );
		$data = $json ? json_decode( $json, true ) : array( 'tools' => array(), 'home' => array() );
	}
	return $data;
}

function cwh_pdf_tool( $slug ) {
	foreach ( cwh_pdf_data()['tools'] as $t ) {
		if ( $t['slug'] === $slug ) {
			return $t;
		}
	}
	return null;
}

/** Which tool (if any) the current singular page embeds. */
function cwh_pdf_current_tool() {
	static $found = false, $tool = null;
	if ( $found ) {
		return $tool;
	}
	$found = true;
	if ( ! is_singular() ) {
		return null;
	}
	$post = get_queried_object();
	if ( ! $post || empty( $post->post_content ) || false === strpos( $post->post_content, '[cwh_pdf' ) ) {
		return null;
	}
	if ( preg_match( '/\[cwh_pdf\s+[^\]]*tool=["\']?([a-z-]+)/', $post->post_content, $m ) ) {
		$tool = $m[1];
	} elseif ( preg_match( '/\[cwh_pdf[\s\]]/', $post->post_content ) ) {
		$tool = 'auto';
	}
	return $tool;
}

/* ------------------------------------------------------------------ *
 * Assets – loaded only on pages that use the shortcode
 * ------------------------------------------------------------------ */
add_action( 'wp_enqueue_scripts', function () {
	if ( ! cwh_pdf_current_tool() ) {
		return;
	}
	wp_enqueue_style( 'cwh-pdf-tools', CWH_PDF_URL . 'assets/cwh-pdf.css', array(), CWH_PDF_VERSION );
	wp_enqueue_script( 'cwh-pdf-tools', CWH_PDF_URL . 'assets/app.js', array(), CWH_PDF_VERSION, array( 'in_footer' => true, 'strategy' => 'defer' ) );
} );

/* ------------------------------------------------------------------ *
 * Shortcodes
 * ------------------------------------------------------------------ */
add_shortcode( 'cwh_pdf', function ( $atts ) {
	$atts = shortcode_atts( array( 'tool' => 'auto', 'tabs' => 'yes' ), $atts, 'cwh_pdf' );
	$slug = sanitize_key( $atts['tool'] );
	$t    = cwh_pdf_tool( $slug );
	if ( ! $t ) {
		$slug = 'auto';
	}

	if ( $t ) {
		$is_pdf_in = 'PDF' === $t['from'] || in_array( $slug, array( 'merge-pdf', 'split-pdf' ), true );
		$label     = $is_pdf_in ? 'PDF' : $t['from'];
		$btn       = sprintf( 'Choose %s file%s', $label, 'split-pdf' === $slug ? '' : 's' );
		$hint      = 'or drag &amp; drop here · paste with Ctrl+V';
	} else {
		$btn  = 'Choose files';
		$hint = 'PDF, Word, Excel, JPG, PNG or TXT · drag &amp; drop or paste';
	}

	ob_start();
	?>
<div class="cwhp">
<ul class="cwhp-badges"><li>Free forever</li><li>No signup</li><li>No watermark</li><li>Files stay on your device</li></ul>
<div id="converter" data-tool="<?php echo esc_attr( $slug ); ?>" data-root="<?php echo esc_url( CWH_PDF_URL ); ?>">
<div class="drop" role="button" tabindex="0" aria-label="<?php echo esc_attr( $btn ); ?>">
<input type="file" multiple aria-hidden="true" tabindex="-1">
<span class="big"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg><?php echo esc_html( $btn ); ?></span>
<p><?php echo $hint; // phpcs:ignore WordPress.Security.EscapeOutput ?></p>
</div>
<div class="choose" hidden></div>
<ul class="files" hidden></ul>
<div class="opts" hidden></div>
<div class="error" role="alert" hidden></div>
<button type="button" class="go" hidden>Convert</button>
<div class="progress" hidden><div class="bar"><i></i></div><p class="status" aria-live="polite"></p></div>
<div class="results" hidden></div>
</div>
<p class="cwhp-privacy">🔒 100% private: files are processed on your device and never uploaded to any server.</p>
<?php if ( 'no' !== $atts['tabs'] ) : ?>
<nav class="cwhp-tabs" aria-label="All PDF tools">
<a class="chip"<?php echo 'auto' === $slug ? ' aria-current="page"' : ''; ?> href="<?php echo esc_url( cwh_pdf_url() ); ?>">All-in-one</a><?php foreach ( cwh_pdf_data()['tools'] as $tool ) : ?><a class="chip"<?php echo $tool['slug'] === $slug ? ' aria-current="page"' : ''; ?> href="<?php echo esc_url( cwh_pdf_url( $tool['slug'] ) ); ?>"><?php echo esc_html( $tool['name'] ); ?></a><?php endforeach; ?>
</nav>
<?php endif; ?>
</div>
	<?php
	return ob_get_clean();
} );

/* [cwh_pdf_tools group="from|to|all" only="pdf-to-word,merge-pdf"] – grid of tool cards */
add_shortcode( 'cwh_pdf_tools', function ( $atts ) {
	$atts  = shortcode_atts( array( 'group' => 'all', 'only' => '' ), $atts, 'cwh_pdf_tools' );
	$only  = array_filter( array_map( 'trim', explode( ',', $atts['only'] ) ) );
	$tools = array();
	foreach ( cwh_pdf_data()['tools'] as $t ) {
		$to_pdf = 'PDF' === $t['to'] || in_array( $t['slug'], array( 'merge-pdf', 'split-pdf' ), true );
		if ( $only && ! in_array( $t['slug'], $only, true ) ) {
			continue;
		}
		if ( ( 'from' === $atts['group'] && $to_pdf ) || ( 'to' === $atts['group'] && ! $to_pdf ) ) {
			continue;
		}
		$tools[] = $t;
	}
	$html = '<div class="cwhp cwhp-grid">';
	foreach ( $tools as $t ) {
		$html .= sprintf(
			'<a class="cwhp-card" href="%s"><span class="fi" aria-hidden="true">%s</span><span><strong>%s</strong><small>%s</small></span></a>',
			esc_url( cwh_pdf_url( $t['slug'] ) ),
			esc_html( $t['icon'] ),
			esc_html( $t['name'] ),
			esc_html( $t['card'] )
		);
	}
	return $html . '</div>';
} );

/* ------------------------------------------------------------------ *
 * Structured data (WebApplication + HowTo + FAQPage)
 * ------------------------------------------------------------------ */
add_action( 'wp_head', function () {
	$slug = cwh_pdf_current_tool();
	if ( ! $slug ) {
		return;
	}
	$url  = get_permalink();
	$app  = array(
		'@type'               => 'WebApplication',
		'@id'                 => $url . '#app',
		'url'                 => $url,
		'applicationCategory' => 'UtilitiesApplication',
		'operatingSystem'     => 'Any (Windows, macOS, Linux, Android, iOS)',
		'browserRequirements' => 'Requires JavaScript and a modern browser',
		'isAccessibleForFree' => true,
		'offers'              => array( '@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'INR' ),
		'publisher'           => array( '@type' => 'Organization', 'name' => get_bloginfo( 'name' ), 'url' => home_url( '/' ) ),
	);
	$graph = array();
	$t     = cwh_pdf_tool( $slug );
	if ( $t ) {
		$app['name']        = $t['name'] . ' Converter';
		$app['description'] = $t['desc'];
		$app['featureList'] = array_column( $t['features'], 0 );
		$graph[]            = $app;
		$graph[]            = array(
			'@type'       => 'HowTo',
			'name'        => $t['howto'],
			'description' => wp_strip_all_tags( $t['answer'] ),
			'totalTime'   => 'PT1M',
			'step'        => array_map( function ( $s, $i ) use ( $url ) {
				return array( '@type' => 'HowToStep', 'position' => $i + 1, 'name' => $s[0], 'text' => $s[1], 'url' => $url . '#how-to' );
			}, $t['steps'], array_keys( $t['steps'] ) ),
		);
		$faqs               = $t['faqs'];
	} else {
		$home               = cwh_pdf_data()['home'];
		$app['name']        = 'Free PDF Converter – All Tools in One';
		$app['description'] = $home['desc'];
		$app['featureList'] = wp_list_pluck( cwh_pdf_data()['tools'], 'name' );
		$graph[]            = $app;
		$graph[]            = array(
			'@type'           => 'ItemList',
			'name'            => 'PDF tools',
			'itemListElement' => array_map( function ( $tool, $i ) {
				return array( '@type' => 'ListItem', 'position' => $i + 1, 'name' => $tool['name'], 'url' => cwh_pdf_url( $tool['slug'] ) );
			}, cwh_pdf_data()['tools'], array_keys( cwh_pdf_data()['tools'] ) ),
		);
		$faqs               = $home['faqs'];
	}
	$graph[] = array(
		'@type'      => 'FAQPage',
		'@id'        => $url . '#faq',
		'mainEntity' => array_map( function ( $f ) {
			return array( '@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => wp_strip_all_tags( $f[1] ) ) );
		}, $faqs ),
	);
	echo '<script type="application/ld+json">' . wp_json_encode( array( '@context' => 'https://schema.org', '@graph' => $graph ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "</script>\n";
}, 20 );

/* ------------------------------------------------------------------ *
 * SEO defaults for Rank Math (used only when the page has no custom
 * Rank Math title/description) + share image.
 * ------------------------------------------------------------------ */
function cwh_pdf_seo( $field ) {
	$slug = cwh_pdf_current_tool();
	if ( ! $slug ) {
		return null;
	}
	$t = cwh_pdf_tool( $slug );
	$d = $t ? $t : cwh_pdf_data()['home'];
	if ( 'image' === $field ) {
		return CWH_PDF_URL . 'assets/og/' . ( $t ? $t['slug'] : 'home' ) . '.png';
	}
	return isset( $d[ $field ] ) ? $d[ $field ] : null;
}

add_filter( 'rank_math/frontend/title', function ( $title ) {
	$v = cwh_pdf_seo( 'title' );
	if ( $v && ! get_post_meta( get_queried_object_id(), 'rank_math_title', true ) ) {
		return $v;
	}
	return $title;
} );
add_filter( 'rank_math/frontend/description', function ( $desc ) {
	$v = cwh_pdf_seo( 'desc' );
	if ( $v && ! get_post_meta( get_queried_object_id(), 'rank_math_description', true ) ) {
		return $v;
	}
	return $desc;
} );
foreach ( array( 'rank_math/opengraph/facebook/image', 'rank_math/opengraph/twitter/image' ) as $cwh_pdf_hook ) {
	add_filter( $cwh_pdf_hook, function ( $img ) {
		$v = cwh_pdf_seo( 'image' );
		return ( $v && ! has_post_thumbnail( get_queried_object_id() ) ) ? $v : $img;
	} );
}
// Without Rank Math: fall back to WordPress' own <title>.
add_filter( 'pre_get_document_title', function ( $title ) {
	if ( defined( 'RANK_MATH_VERSION' ) ) {
		return $title;
	}
	$v = cwh_pdf_seo( 'title' );
	return $v ? $v : $title;
} );

/* ------------------------------------------------------------------ *
 * WP Rocket compatibility: the converter must run immediately and its
 * dynamically-added classes must survive "Remove Unused CSS".
 * ------------------------------------------------------------------ */
add_filter( 'rocket_delay_js_exclusions', function ( $list ) {
	$list[] = 'cwh-pdf-tools';
	return $list;
} );
add_filter( 'rocket_exclude_js', function ( $list ) {
	$list[] = '/wp-content/plugins/cwh-pdf-tools/(.*).js';
	return $list;
} );
add_filter( 'rocket_rucss_safelist', function ( $list ) {
	$list[] = '/wp-content/plugins/cwh-pdf-tools/assets/cwh-pdf.css';
	$list[] = '.cwhp(.*)';
	$list[] = '.r-(.*)';
	return $list;
} );
add_filter( 'rocket_exclude_css', function ( $list ) {
	$list[] = '/wp-content/plugins/cwh-pdf-tools/assets/cwh-pdf.css';
	return $list;
} );

/* Settings link on the plugins screen */
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( $links ) {
	$links[] = '<a href="' . esc_url( cwh_pdf_url() ) . '" target="_blank">View tools</a>';
	return $links;
} );
