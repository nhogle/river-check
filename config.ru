use Rack::Static,
  :urls => ["/images", "/js", "/css", "/xml"],
  :root => "public"

run lambda { |env|
  [
    200,
    {
      'content-type'  => 'text/html',
      'cache-control' => 'public, max-age=86400'
    },
    File.open('public/index.html', File::RDONLY)
  ]
}
