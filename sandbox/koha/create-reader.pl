use Modern::Perl;
use C4::Context;
use Koha::Library;
use Koha::Libraries;
use Koha::Patron::Categories;
use Koha::Patron;
use Koha::Patrons;
use Koha::ApiKey;
use Koha::ApiKeys;
use JSON qw(encode_json);
my $patron = Koha::Patrons->find({ userid => 'shelf_catalog_reader' });
if ($patron) {
    die "Existing integration userid is not the expected password-disabled synthetic reader; refusing to modify it\n"
        unless ($patron->cardnumber // '') eq 'SHELF-DEMO-READER'
            && ($patron->surname // '') eq 'Synthetic Shelf catalog integration'
            && ($patron->branchcode // '') eq 'ASH'
            && ($patron->flags // 0) == 4
            && ($patron->password // '') eq '!';
}
for my $code (qw(ASH RUST PUR)) {
    Koha::Library->new({branchcode=>$code, branchname=>"Shelf synthetic $code branch"})->store unless Koha::Libraries->find($code);
}
my $category = Koha::Patron::Categories->search({ category_type => 'S' })->next
    || Koha::Patron::Categories->search()->next or die "No sample category\n";
$patron ||= Koha::Patron->new({userid => 'shelf_catalog_reader', surname => 'Synthetic Shelf catalog integration', cardnumber => 'SHELF-DEMO-READER', branchcode => 'ASH', categorycode => $category->categorycode, dateexpiry => '2099-12-31', flags => 4})->store;
die "New synthetic reader must have password login disabled\n" unless ($patron->password // '') eq '!';
C4::Context->set_preference('RESTOAuth2ClientCredentials', 1);
# Koha::Patron->store creates a disabled password ('!') when no password is supplied.
# Existing accounts are reused only after the strict synthetic-reader guard above.
my $key = Koha::ApiKey->new({patron_id=>$patron->borrowernumber, description=>'Shelf sandbox catalogue reader'})->store;
print encode_json({KOHA_API_URL=>'http://127.0.0.1:18081/api/v1',KOHA_SANDBOX_ONLY=>'1',KOHA_BRANCH_MAP=>encode_json({ASH=>'ASH',RUST=>'RUST',PUR=>'PUR'}),KOHA_CLIENT_ID=>$key->client_id,KOHA_CLIENT_SECRET=>$key->plain_text_secret});
