use Modern::Perl;
use Koha::Items;
use JSON qw(encode_json);
my $value = shift @ARGV;
die "Usage: set-test-item.pl 0|1\n" unless defined($value) && $value =~ /\A[01]\z/;
my $item = Koha::Items->find({barcode=>'SHELF-DEMO-RUST-001'}) or die "Seeded synthetic item not found\n";
die "Unexpected branch for seeded item\n" unless $item->holdingbranch eq 'RUST';
$item->notforloan($value)->store;
print encode_json({item_id=>$item->itemnumber,not_for_loan=>0+$value});
