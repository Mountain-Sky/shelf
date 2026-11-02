# Creates only named synthetic circulation fixtures; never resets a database.
use Modern::Perl;
use JSON qw(encode_json decode_json);
use C4::Context;
use C4::Biblio qw(AddBiblio);
use C4::Circulation qw(AddIssue);
use Koha::Patrons;
use Koha::Patron;
use Koha::Patron::Categories;
use Koha::Patron::Category;
use Koha::Database;
use Koha::ApiKey;
use Koha::ApiKeys;
use Koha::Items;
use Koha::Item;
use Koha::CirculationRules;
use MARC::Record;
use MARC::Field;
use DateTime;
my $input = decode_json(do { local $/; <STDIN> });
my $transaction = Koha::Database->new->schema->txn_scope_guard;
my $category = Koha::Patron::Categories->find('SHELF');
die "Unexpected SHELF category\n" if $category && $category->description ne "Synthetic Shelf circulation testing";
$category ||= Koha::Patron::Category->new({categorycode=>'SHELF',description=>'Synthetic Shelf circulation testing',category_type=>'A',enrolmentperiod=>12})->store;
my @patrons;
for my $i (1..2) {
  my $p = Koha::Patrons->find({userid=>"shelf_test_reader_$i"});
  die "Unexpected synthetic patron\n" if $p && (($p->cardnumber // "") ne "SHELF-CIRC-READER-$i" || $p->categorycode ne "SHELF" || ($p->flags // 0) != 0);
  $p ||= Koha::Patron->new({userid=>"shelf_test_reader_$i",cardnumber=>"SHELF-CIRC-READER-$i",surname=>'Synthetic Shelf test reader',firstname=>"$i",branchcode=>'CPL',categorycode=>'SHELF',dateexpiry=>'2099-12-31',flags=>0})->store;
  $p->set_password({password=>$input->{password},skip_validation=>1});
  push @patrons, $p;
}
my $service = Koha::Patrons->find({userid=>"shelf_circulation_service"});
die "Unexpected service patron\n" if $service && (($service->cardnumber // "") ne "SHELF-CIRC-SERVICE" || ($service->flags // 0) != 68 || ($service->password // "") ne "!");
$service ||= Koha::Patron->new({userid=>'shelf_circulation_service',cardnumber=>'SHELF-CIRC-SERVICE',surname=>'Synthetic Shelf circulation service',branchcode=>'CPL',categorycode=>'SHELF',dateexpiry=>'2099-12-31',flags=>68})->store;
# Catalogue + hold-management flag required by the pinned POST /holds API;
# grant only the additional named circulation/password-validation subpermissions.
my $dbh=C4::Context->dbh;
for my $permission ([1,'circulate_remaining_permissions'],[4,'api_validate_password']) {
 $dbh->do('INSERT IGNORE INTO user_permissions (borrowernumber,module_bit,code) VALUES (?,?,?)',undef,$service->borrowernumber,@$permission);
}
my $key=Koha::ApiKey->new({patron_id=>$service->borrowernumber,description=>'Shelf isolated circulation sandbox'})->store;
Koha::CirculationRules->set_rules({branchcode=>undef,categorycode=>'SHELF',itemtype=>'BK',rules=>{issuelength=>21,lengthunit=>'days',renewalperiod=>21,renewalsallowed=>5,reservesallowed=>5,holds_per_record=>1,onshelfholds=>1}});
Koha::CirculationRules->set_rules({branchcode=>undef,categorycode=>'SHELF',rules=>{patron_maxissueqty=>10,max_holds=>5}});
C4::Context->set_userenv($service->borrowernumber,$service->userid,$service->cardnumber,'Shelf','Service','CPL','Centerville',68);
my @records;
for my $kind ('LOAN','HOLD') {
 my $item=Koha::Items->find({barcode=>"SHELF-CIRC-$kind"});
 my ($bid,$biid);
 if ($item) { $bid=$item->biblionumber; $biid=$item->biblioitemnumber; die "Unexpected fixture item" unless $item->homebranch eq 'CPL' && $item->biblio->title eq "Shelf circulation test $kind"; } else {
 my $record=MARC::Record->new;
 $record->leader('00000nam a2200000 a 4500');
 $record->append_fields(MARC::Field->new('245','0','0',a=>"Shelf circulation test $kind"),MARC::Field->new('520',' ',' ',a=>'Clearly synthetic record for local account, hold, and renewal tests.'),MARC::Field->new('655',' ','7',a=>'Integration test fixtures.'),MARC::Field->new('942',' ',' ',c=>'BK'));
 ($bid,$biid)=AddBiblio($record,'');
 $item=Koha::Item->new({biblionumber=>$bid,biblioitemnumber=>$biid,homebranch=>'CPL',holdingbranch=>'CPL',barcode=>"SHELF-CIRC-$kind",itype=>'BK',notforloan=>0})->store;
 }
 if ($kind eq 'LOAN' && !$item->checkout) { AddIssue($patrons[0],$item->barcode,DateTime->now(time_zone=>'local')->add(days=>7)); }
 push @records,{kind=>$kind,biblio_id=>$bid,item_id=>$item->itemnumber};
}
$transaction->commit;
print encode_json({KOHA_CIRC_CLIENT_ID=>$key->client_id,KOHA_CIRC_CLIENT_SECRET=>$key->plain_text_secret,KOHA_TEST_PATRON_IDS=>join(',',map {$_->borrowernumber} @patrons),username=>$patrons[0]->userid,other_username=>$patrons[1]->userid,password=>$input->{password},records=>\@records});
